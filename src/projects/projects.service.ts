import { HttpService, Injectable, Logger } from '@nestjs/common';
import Project from './interfaces/project.interface';
import { forkJoin, interval, Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import HealthCheckStatus from './interfaces/healthCheckStatus.interface';
import HealthCheck from './interfaces/healthCheck.interface';
import StatusOverview from './interfaces/statusOverview.interface';
import { ProjectStatus } from './interfaces/projectStatus.interface';
import CustomAxiosRequestConfig from './interfaces/customAxiosRequestConfig.interface';

@Injectable()
export class ProjectsService {

  constructor(private http: HttpService) {}

  private logger: Logger = new Logger('ProjectsService');

  monitorProjects(projects: Project[], intervalLength: number): Observable<StatusOverview> {
    return interval(intervalLength).pipe(
      startWith(() => this.getAllHealthChecks(projects)),
      switchMap(() => this.getAllHealthChecks(projects)),
      map(healthCheckStatuses => this.getStatusOverview(healthCheckStatuses, projects)),
    );
  }

  private getAllHealthChecks(projectsConfig: Project[], healthCheckCalls = []): Observable<any> {
    projectsConfig.forEach(projConfig => {
      healthCheckCalls.push(this.getHealthCheck(projConfig.healthCheck, projConfig.name));
      if (projConfig.dependencies && projConfig.dependencies.length) {
        this.getAllHealthChecks(projConfig.dependencies, healthCheckCalls);
      }
    });
    return forkJoin(healthCheckCalls);
  }

  private getHealthCheck(healthCheck: HealthCheck, projectName: string): Observable<HealthCheckStatus> {
    const timestamp = new Date().toISOString();
    let up = false;
    const warning = null;
    return this.getHealthCheckCall(healthCheck).pipe(
      map((res): HealthCheckStatus => {
        up = healthCheck.successStatuses.includes(res.status);
        return {
          responseBody: res.data,
          status: res.status,
          path: healthCheck.path,
          method: healthCheck.method,
          timestamp,
          up,
          projectName,
          warning,
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
        up = healthCheck.successStatuses.includes(status);
        return of({
          responseBody,
          status,
          path: healthCheck.path,
          method: healthCheck.method,
          timestamp,
          up,
          projectName,
          warning,
        });
      }),
    );
  }

  private getStatusOverview(healthCheckStatuses: HealthCheckStatus[], projects: Project[]): StatusOverview {
    return projects.reduce((acc, project) => {
      acc[project.name] = {
        status: healthCheckStatuses.find(hcStatus => hcStatus.projectName === project.name),
      };
      if (project.dependencies && project.dependencies.length) {
        acc[project.name].dependencies = this.getStatusOverview(healthCheckStatuses, project.dependencies);
        acc[project.name].status.warning = Object.values(acc[project.name].dependencies).some((dep: ProjectStatus) => {
          return !dep.status.up || dep.status.warning;
        });
      }
      return acc;
    }, {});
  }

  private getHealthCheckCall(healthCheck: HealthCheck): Observable<any> {
    const config: CustomAxiosRequestConfig = {};
    if (healthCheck.headers) {
      config.headers = healthCheck.headers;
    }
    switch (healthCheck.method.toLowerCase()) {
      case 'post':
        return this.http.post(healthCheck.path, healthCheck.requestBody, config);
      case 'put':
        return this.http.put(healthCheck.path, healthCheck.requestBody, config);
      default:
        return this.http.get(healthCheck.path, config);
    }
  }
}
