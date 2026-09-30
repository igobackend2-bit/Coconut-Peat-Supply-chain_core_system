import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DRIZZLE } from '../db/drizzle.provider';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DRIZZLE, useValue: {} }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('reports process health without touching the database', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'coco-pith-factory-api',
    });
  });
});
