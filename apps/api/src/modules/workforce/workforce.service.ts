import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { attendance, employees, labourAllocations, shifts } from '../../db/schema';
import { CreateAllocationDto, CreateAttendanceDto, CreateShiftDto } from './workforce.dto';

// Hours an employee can be allocated in a day, by attendance status.
const HOUR_CAP = { PRESENT: 12, HALF_DAY: 6 } as const;

@Injectable()
export class WorkforceService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  listShifts() { return this.db.select().from(shifts).orderBy(shifts.startTime); }

  async createShift(dto: CreateShiftDto) {
    const [dup] = await this.db.select({ id: shifts.id }).from(shifts).where(eq(shifts.code, dto.code));
    if (dup) throw new ConflictException(`Shift code ${dto.code} already exists`);
    const [row] = await this.db.insert(shifts).values(dto).returning();
    return row;
  }

  listAttendance(date?: string) {
    const q = this.db.select().from(attendance);
    return (date ? q.where(eq(attendance.workDate, date)) : q).orderBy(desc(attendance.workDate));
  }

  async markAttendance(dto: CreateAttendanceDto) {
    const [emp] = await this.db.select({ id: employees.id }).from(employees).where(eq(employees.id, dto.employeeId));
    if (!emp) throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    const [dup] = await this.db
      .select({ id: attendance.id })
      .from(attendance)
      .where(and(eq(attendance.employeeId, dto.employeeId), eq(attendance.workDate, dto.workDate)));
    if (dup) throw new ConflictException(`Attendance for employee ${dto.employeeId} on ${dto.workDate} is already recorded`);
    const [row] = await this.db.insert(attendance).values(dto).returning();
    return row;
  }

  /** Counts per status for a day, plus total hours allocated that day. */
  async summary(date: string) {
    const byStatus = await this.db
      .select({ status: attendance.status, count: sql<number>`count(*)::int` })
      .from(attendance)
      .where(eq(attendance.workDate, date))
      .groupBy(attendance.status);
    const [{ hours }] = await this.db
      .select({ hours: sql<string>`COALESCE(SUM(${labourAllocations.hours}), 0)` })
      .from(labourAllocations)
      .where(eq(labourAllocations.workDate, date));
    return { date, attendance: Object.fromEntries(byStatus.map((r) => [r.status, r.count])), allocatedHours: hours };
  }

  listAllocations(date?: string) {
    const q = this.db.select().from(labourAllocations);
    return (date ? q.where(eq(labourAllocations.workDate, date)) : q).orderBy(desc(labourAllocations.createdAt));
  }

  /**
   * Labour can only be allocated to someone who actually attended that
   * day, and not beyond the hour cap for their attendance status.
   */
  async allocate(dto: CreateAllocationDto) {
    const [att] = await this.db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, dto.employeeId), eq(attendance.workDate, dto.workDate)));
    if (!att) throw new ConflictException(`No attendance recorded for employee ${dto.employeeId} on ${dto.workDate} — mark attendance first`);
    if (att.status !== 'PRESENT' && att.status !== 'HALF_DAY') {
      throw new ConflictException(`Employee was ${att.status} on ${dto.workDate} — cannot allocate labour`);
    }
    const [{ used }] = await this.db
      .select({ used: sql<string>`COALESCE(SUM(${labourAllocations.hours}), 0)` })
      .from(labourAllocations)
      .where(and(eq(labourAllocations.employeeId, dto.employeeId), eq(labourAllocations.workDate, dto.workDate)));
    const cap = HOUR_CAP[att.status];
    if (Number(used) + dto.hours > cap) {
      throw new ConflictException(`Allocating ${dto.hours}h would exceed the ${cap}h cap for a ${att.status} day (already allocated: ${Number(used)}h)`);
    }
    const [row] = await this.db.insert(labourAllocations).values({ ...dto, hours: dto.hours.toString() }).returning();
    return row;
  }
}
