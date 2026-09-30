import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { approvals, productGradeQcSpecs, productionBatches, qcResults, qcSamples } from '../../../db/schema';
import { CreateQcResultDto } from './dto/create-qc-result.dto';
import { CreateQcSampleDto } from './dto/create-qc-sample.dto';

@Injectable()
export class QcSamplesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(qcSamples);
  }

  async findOne(id: string) {
    const [sample] = await this.db.select().from(qcSamples).where(eq(qcSamples.id, id));
    if (!sample) {
      throw new NotFoundException(`QC sample ${id} not found`);
    }
    return sample;
  }

  async create(dto: CreateQcSampleDto) {
    const [batch] = await this.db.select().from(productionBatches).where(eq(productionBatches.id, dto.productionBatchId));
    if (!batch) {
      throw new NotFoundException(`Production batch ${dto.productionBatchId} not found`);
    }
    if (batch.status !== 'COMPLETED' && batch.status !== 'ON_HOLD') {
      throw new ConflictException(`Production batch ${dto.productionBatchId} is "${batch.status}" — must be COMPLETED (or already ON_HOLD) to sample`);
    }

    const [sample] = await this.db.insert(qcSamples).values({ productionBatchId: dto.productionBatchId }).returning();
    return sample;
  }

  async listResults(sampleId: string) {
    return this.db.select().from(qcResults).where(eq(qcResults.qcSampleId, sampleId));
  }

  /**
   * Compares measuredValue against the sampled batch's product grade's
   * spec (product_grade_qc_specs, Master Data — Phase 1). If out of
   * spec, auto-transitions the batch to ON_HOLD and creates a PENDING
   * approval record — implementing docs/agents.md A05's rule that a
   * held batch needs explicit human authorization to release
   * (docs/permissions.md's approval mechanism, first built for
   * Purchase Orders in Phase 2, reused here unchanged).
   */
  async addResult(sampleId: string, dto: CreateQcResultDto, requestedBy: string) {
    const sample = await this.findOne(sampleId);
    const [batch] = await this.db.select().from(productionBatches).where(eq(productionBatches.id, sample.productionBatchId));
    if (!batch) {
      throw new NotFoundException(`Production batch for QC sample ${sampleId} not found`);
    }
    if (batch.status !== 'COMPLETED' && batch.status !== 'ON_HOLD') {
      throw new ConflictException(`Production batch ${batch.id} is "${batch.status}" — cannot record QC results`);
    }

    let passed: boolean | null = null;
    if (batch.productGradeId) {
      const [spec] = await this.db
        .select()
        .from(productGradeQcSpecs)
        .where(and(eq(productGradeQcSpecs.productGradeId, batch.productGradeId), eq(productGradeQcSpecs.qcParameterId, dto.qcParameterId)));
      if (spec) {
        const min = spec.minValue === null ? null : Number(spec.minValue);
        const max = spec.maxValue === null ? null : Number(spec.maxValue);
        passed = (min === null || dto.measuredValue >= min) && (max === null || dto.measuredValue <= max);
      }
    }

    const [result] = await this.db
      .insert(qcResults)
      .values({
        qcSampleId: sampleId,
        qcParameterId: dto.qcParameterId,
        measuredValue: dto.measuredValue.toString(),
        passed,
      })
      .returning();

    if (passed === false && batch.status === 'COMPLETED') {
      await this.db.update(productionBatches).set({ status: 'ON_HOLD', updatedAt: new Date() }).where(eq(productionBatches.id, batch.id));
      await this.db.insert(approvals).values({
        entityType: 'production_batch',
        entityId: batch.id,
        reason: `QC result out of spec: measured ${dto.measuredValue} for parameter ${dto.qcParameterId}`,
        requestedBy,
      });
    }

    return result;
  }
}
