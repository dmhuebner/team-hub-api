import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsGateway } from './projects.gateway';

describe('ProjectsGateway', () => {
  let gateway: ProjectsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectsGateway],
    }).compile();

    gateway = module.get<ProjectsGateway>(ProjectsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
