import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { approvals, batchInputs, batchOutputs, productionBatches, rawMaterialLots, stockLedger } from '../../../db/schema';
import { CreateBatchInputDto } from './dto/create-batch-input.dto';
import { CreateBatchOutputDto } from './dto/create-batch-output.dto';
import { CreateProductionBatchDto } from './dto/create-production-batch.dto';
import { DecideBatchDto } from './dto/decide-batch.dto';

@Injectable()
export class ProductionBatchesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(productionBatches);
  }

  async findOne(id: string) {
    const [batch] = await this.db.select().from(productionBatches).where(eq(productionBatches.id, id));
    if (!batch) {
      throw new NotFoundException(`Production batch ${id} not found`);
    }
    return batch;
  }

  async create(dto: CreateProductionBatchDto) {
    const [batch] = await this.db
      .insert(productionBatches)
      .values({
        batchNumber: this.generateBatchNumber(),
        productId: dto.productId,
        productGradeId: dto.productGradeId,
        plannedQuantityKg: dto.plannedQuantityKg?.toString(),
      })
      .returning();
    return batch;
  }

  async listInputs(batchId: string) {
    return this.db.select().from(batchInputs).where(eq(batchInputs.productionBatchId, batchId));
  }

  /**
   * Consumes a raw material lot in full — see production.schema.ts's
   * doc comment on the "one lot, consumed once" MVP simplification.
   * Also writes a stock_ledger entry (Phase 4) — this used to only
   * flip the lot's status, a documented gap now closed: consumption is
   * a real, ledgered stock movement, not just a status change.
   */
  async addInput(batchId: string, dto: CreateBatchInputDto) {
    const batch = await this.findOne(batchId);
    if (batch.status !== 'IN_PROGRESS') {
      throw new ConflictException(`Production batch ${batchId} is "${batch.status}", not IN_PROGRESS — cannot add inputs`);
    }

    const [lot] = await this.db.select().from(rawMaterialLots).where(eq(rawMaterialLots.id, dto.rawMaterialLotId));
    if (!lot) {
      throw new NotFoundException(`Raw material lot ${dto.rawMaterialLotId} not found`);
    }
    if (lot.status === 'CONSUMED') {
      throw new ConflictException(`Raw material lot ${dto.rawMaterialLotId} is already CONSUMED`);
    }

    const [input] = await this.db
      .insert(batchInputs)
      .values({
        productionBatchId: batchId,
        rawMaterialLotId: dto.rawMaterialLotId,
        quantityConsumedKg: dto.quantityConsumedKg.toString(),
      })
      .returning();

    await this.db.update(rawMaterialLots).set({ status: 'CONSUMED', updatedAt: new Date() }).where(eq(rawMaterialLots.id, dto.rawMaterialLotId));

    await this.db.insert(stockLedger).values({
      productId: lot.productId,
      locationId: lot.storageLocationId,
      movementType: 'RAW_MATERIAL_CONSUMPTION',
      quantityKg: (-dto.quantityConsumedKg).toString(), // negative: leaving stock
      referenceType: 'production_batch',
      referenceId: batchId,
    });

    return input;
  }

  async listOutputs(batchId: string) {
    return this.db.select().from(batchOutputs).where(eq(batchOutputs.productionBatchId, batchId));
  }

  /** Also writes a stock_ledger entry (positive — entering stock) — see addInput's doc comment for why this exists now. */
  async addOutput(batchId: string, dto: CreateBatchOutputDto) {
    const batch = await this.findOne(batchId);
    if (batch.status !== 'IN_PROGRESS') {
      throw new ConflictException(`Production batch ${batchId} is "${batch.status}", not IN_PROGRESS — cannot add outputs`);
    }

    const [output] = await this.db
      .insert(batchOutputs)
      .values({
        productionBatchId: batchId,
        productId: dto.productId,
        productGradeId: dto.productGradeId,
        quantityKg: dto.quantityKg.toString(),
      })
      .returning();

    await this.db.insert(stockLedger).values({
      productId: dto.productId,
      movementType: 'PRODUCTION_OUTPUT',
      quantityKg: dto.quantityKg.toString(),
      referenceType: 'production_batch',
      referenceId: batchId,
    });

    return output;
  }

  async complete(batchId: string) {
    const batch = await this.findOne(batchId);
    if (batch.status !== 'IN_PROGRESS') {
      throw new ConflictException(`Production batch ${batchId} is "${batch.status}", not IN_PROGRESS`);
    }

    const outputs = await this.listOutputs(batchId);
    if (outputs.length === 0) {
      throw new BadRequestException(`Production batch ${batchId} has no recorded outputs — cannot complete`);
    }

    const [updated] = await this.db
      .update(productionBatches)
      .set({ status: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(productionBatches.id, batchId))
      .returning();

    return updated;
  }

  /**
   * Per docs/agents.md A05: "AI cannot independently release a
   * rejected/held batch unless explicitly authorized by policy." A
   * batch that was never put ON_HOLD (all QC passed, or no QC run) can
   * be released directly from COMPLETED with no approval gate — the
   * gate specifically applies when there's something to override.
   */
  async release(batchId: string, dto: DecideBatchDto, decidedBy: string) {
    return this.decide(batchId, 'RELEASED', dto, decidedBy);
  }

  async reject(batchId: string, dto: DecideBatchDto, decidedBy: string) {
    return this.decide(batchId, 'REJECTED', dto, decidedBy);
  }

  private async decide(batchId: string, decision: 'RELEASED' | 'REJECTED', dto: DecideBatchDto, decidedBy: string) {
    const batch = await this.findOne(batchId);
    if (batch.status !== 'COMPLETED' && batch.status !== 'ON_HOLD') {
      throw new ConflictException(`Production batch ${batchId} is "${batch.status}" — must be COMPLETED or ON_HOLD to decide`);
    }

    if (batch.status === 'ON_HOLD') {
      const [approval] = await this.db
        .select()
        .from(approvals)
        .where(and(eq(approvals.entityType, 'production_batch'), eq(approvals.entityId, batchId), eq(approvals.status, 'PENDING')));
      if (!approval) {
        throw new BadRequestException(`No pending approval record found for held production batch ${batchId}`);
      }
      await this.db
        .update(approvals)
        .set({
          status: decision === 'RELEASED' ? 'APPROVED' : 'REJECTED',
          decidedBy,
          decidedAt: new Date(),
          decisionReason: dto.reason,
        })
        .where(eq(approvals.id, approval.id));
    }

    const [updated] = await this.db
      .update(productionBatches)
      .set({ status: decision, updatedAt: new Date() })
      .where(eq(productionBatches.id, batchId))
      .returning();

    return updated;
  }

  async close(batchId: string) {
    const batch = await this.findOne(batchId);
    if (batch.status !== 'RELEASED' && batch.status !== 'REJECTED') {
      throw new ConflictException(`Production batch ${batchId} is "${batch.status}" — must be RELEASED or REJECTED to close`);
    }

    const [updated] = await this.db
      .update(productionBatches)
      .set({ status: 'CLOSED', updatedAt: new Date() })
      .where(eq(productionBatches.id, batchId))
      .returning();

    return updated;
  }

  private generateBatchNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `PB-${datePart}-${randomPart}`;
  }
}
