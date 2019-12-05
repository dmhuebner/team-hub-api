import { HttpService, Injectable, Logger } from '@nestjs/common';
import Project from './interfaces/project.interface';
import { forkJoin, interval, Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import HealthCheckStatus from './interfaces/healthCheckStatus.interface';

@Injectable()
export class ProjectsService {

  constructor(private http: HttpService) {}

  private logger: Logger = new Logger('ProjectsService');

  monitorProjects(projects: Project[], intervalLength: number): Observable<any> {
    return interval(intervalLength).pipe(
      startWith(() => this.getAllHealthChecks(projects)),
      switchMap(() => this.getAllHealthChecks(projects)),
    );
  }

  private getAllHealthChecks(projectsConfig: Project[], healthCheckCalls = []): Observable<any> {
    projectsConfig.forEach(projConfig => {
      healthCheckCalls.push(this.getHealthCheck(projConfig.healthCheck.path, projConfig.name));
      if (projConfig.dependencies && projConfig.dependencies.length) {
        this.getAllHealthChecks(projConfig.dependencies, healthCheckCalls);
      }
    });
    return forkJoin(healthCheckCalls);
  }

  private getHealthCheck(path: string, projectName: string): any | Observable<HealthCheckStatus> {
    const timestamp = new Date().toISOString();
    // TODO check if its up based on successStatuses
    const up = null;
    return this.http.get(path).pipe(
      tap(res => this.logger.debug(JSON.stringify(res.status))),
      map((res): HealthCheckStatus => {
        return {
          responseBody: res.data,
          status: res.status,
          path,
          method: 'GET',
          timestamp,
          up,
          projectName,
        };
      }),
      catchError((err): Observable<HealthCheckStatus> => {
        const responseBody = err && err.message ? err.message : err;
        const splitErrorMessage = err && err.message && err.message.split(' ').length ? err.message.split(' ') : [];
        let status = Number(splitErrorMessage[splitErrorMessage.length - 1]);
        if (!err.message.includes(('status code').toLowerCase()) || isNaN(status)) {
          // If message does not include 'status code' text or if last word is not a status - set status to null;
          status = null;
        }
        return of({
          responseBody,
          status,
          path,
          method: 'GET',
          timestamp,
          up,
          projectName,
        });
      }),
    );
  }
}
