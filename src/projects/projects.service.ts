import { HttpService, Injectable, Logger } from '@nestjs/common';
import Project from './interfaces/project.interface';
import { forkJoin, interval, Observable, of, Subject } from 'rxjs';
import { catchError, map, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import HealthCheckStatus from './interfaces/healthCheckStatus.interface';
import HealthCheck from './interfaces/healthCheck.interface';
import StatusOverview from './interfaces/statusOverview.interface';
import { ProjectStatus } from './interfaces/projectStatus.interface';
import CustomAxiosRequestConfig from './interfaces/customAxiosRequestConfig.interface';
import { WsResponse } from '@nestjs/websockets';
import HealthCheckSuccessCriteria from './interfaces/health-check-success-criteria.interface';
import JsonContainsMap from './interfaces/json-contains-map.interface';

@Injectable()
export class ProjectsService {

  private logger: Logger = new Logger('ProjectsService');
  projectsMonitor$: Observable<WsResponse>;
  monitorUnsubscribe$ = new Subject();

  constructor(private http: HttpService) {}

  monitorProjects(projects: Project[], intervalLength: number): Observable<StatusOverview> {
    return interval(intervalLength).pipe(
      startWith(() => this.getAllHealthChecks(projects)),
      switchMap(() => this.getAllHealthChecks(projects)),
      map(healthCheckStatuses => this.getStatusOverview(healthCheckStatuses, projects)),
      tap(f => this.logger.debug('MONITORING: ')),
      takeUntil(this.monitorUnsubscribe$),
    );
  }

  setProjectsMonitor(monitor$: Observable<any>) {
    this.projectsMonitor$ = monitor$;
  }

  private getAllHealthChecks(projectsConfig: Project[], healthCheckCalls = []): Observable<any> {
    projectsConfig.forEach(projConfig => {
      projConfig.healthChecks.forEach(healthCheck => {
        healthCheckCalls.push(this.getHealthCheck(healthCheck, projConfig.name));
      });

      if (projConfig.dependencies && projConfig.dependencies.length) {
        this.getAllHealthChecks(projConfig.dependencies, healthCheckCalls);
      }
    });
    return forkJoin(healthCheckCalls);
  }

  // Makes an individual healthCheck call and returns an Observable of a HealthCheckStatus
  private getHealthCheck(healthCheck: HealthCheck, projectName: string): Observable<HealthCheckStatus> {
    const timestamp = new Date().toISOString();
    let up = false;
    const warning = null;
    return this.getHealthCheckCall(healthCheck).pipe(
      map((res): HealthCheckStatus => {
        // Check successCriteria
        const successCriteriaCheck = this.checkSuccessCriteria(healthCheck.successCriteria, res.status, res.data);
        up = successCriteriaCheck.up;
        return {
          responseBody: res.data,
          status: res.status,
          path: healthCheck.path,
          method: healthCheck.method,
          timestamp,
          up,
          projectName,
          warning,
          invalidResponseBody: successCriteriaCheck.invalidResponseBody,
          successCriteria: healthCheck.successCriteria,
          healthCheckName: healthCheck.name,
        };
      }),
      catchError((err): Observable<HealthCheckStatus> => {
        const responseBody = err && err.message ? err.message : err;
        // Split the error message to parse the error status out of the string.
        // The Nest.js http service doesn't provide access to a status property when an error is returned
        const splitErrorMessage = err && err.message && err.message.split(' ').length ? err.message.split(' ') : [];
        let status = Number(splitErrorMessage[splitErrorMessage.length - 1]);
        if (!err.message.includes(('status code').toLowerCase()) || isNaN(status)) {
          // If message does not include 'status code' text or if last word is not a status - set status to null;
          status = null;
        }
        // Check successCriteria
        const successCriteriaCheck = this.checkSuccessCriteria(healthCheck.successCriteria, status, err.message);
        up = successCriteriaCheck.up;
        return of({
          responseBody,
          status,
          path: healthCheck.path,
          method: healthCheck.method,
          timestamp,
          up,
          projectName,
          warning,
          invalidResponseBody: successCriteriaCheck.invalidResponseBody,
          successCriteria: healthCheck.successCriteria,
          healthCheckName: healthCheck.name,
        });
      }),
    );
  }

  private getStatusOverview(healthCheckStatuses: HealthCheckStatus[], projects: Project[]): StatusOverview {
    return projects.reduce((acc, project) => {
      const projectHealthCheckStatuses = healthCheckStatuses.filter(hcStatus => hcStatus.projectName === project.name);
      acc[project.name] = {
        statuses: projectHealthCheckStatuses,
        up: projectHealthCheckStatuses && projectHealthCheckStatuses.length ? projectHealthCheckStatuses.some(hcStatus => hcStatus.up) : true,
        warning: projectHealthCheckStatuses && projectHealthCheckStatuses.length ? projectHealthCheckStatuses.some(hcStatus => !hcStatus.up) : false,
      };
      if (project.dependencies && project.dependencies.length) {
        acc[project.name].dependencies = this.getStatusOverview(healthCheckStatuses, project.dependencies);
        acc[project.name].warning = Object.values(acc[project.name].dependencies).some((dep: ProjectStatus) => {
          return !dep.up || dep.warning;
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

  // TODO refactor to clean up?
  private checkSuccessCriteria(successCriteria: HealthCheckSuccessCriteria, status: number, healthCheckResponseBody): SuccessCriteriaCheck {
    let up = false;
    let invalidResponseBody = false;

    if (successCriteria.successResponseBody) {
      if (successCriteria.successResponseBody.type === 'string') {
        if (successCriteria.successResponseBody.responseBodyContains &&
          typeof healthCheckResponseBody === 'string' &&
          successCriteria.successResponseBody.responseBodyContains.every(content => healthCheckResponseBody.indexOf(content as string) !== -1)) {
          up = true;
        } else {
          up = (successCriteria.successResponseBody.responseBodyEquals &&
            healthCheckResponseBody === successCriteria.successResponseBody.responseBodyEquals);
        }
      } else if (successCriteria.successResponseBody.type === 'json') {
        if (successCriteria.successResponseBody.responseBodyContains && typeof healthCheckResponseBody !== 'string') {
          up = this.searchObjectForSuccessCriteriaProps(
            healthCheckResponseBody,
            successCriteria.successResponseBody.responseBodyContains as JsonContainsMap[],
          );
        } else {
          up = (successCriteria.successResponseBody.responseBodyEquals &&
            JSON.stringify(healthCheckResponseBody) === successCriteria.successResponseBody.responseBodyEquals);
        }
      }

      // If its not up after the checks above its due to the response body being invalid
      if (!up) {
        invalidResponseBody = true;
      }
    }

    // Set 'up' based on successStatuses
    up = successCriteria.successStatuses.includes(status);
    // Set 'up' to false if invalidResponseBody is true;
    if (invalidResponseBody) {
      up = false;
    }

    return {up, invalidResponseBody};
  }

  private searchObjectForSuccessCriteriaProps(objectToSearch: any, containsList: JsonContainsMap[]): boolean {
    const searchResults: boolean[] = [];
    containsList.forEach(containsMap => {
      if (containsMap.property.indexOf('.') !== -1) {
        const nestedProps = containsMap.property.split('.');
        nestedProps.reduce((obj, prop, i) => {
          if (nestedProps.length === i + 1) {
            searchResults.push(obj[prop] === containsMap.expectedValue);
          }
          return obj[prop];
        }, objectToSearch);
      } else {
        searchResults.push(objectToSearch[containsMap.property] === containsMap.expectedValue);
      }
    });
    return searchResults.every(result => result);
  }
}

interface SuccessCriteriaCheck {
  up: boolean;
  invalidResponseBody: boolean;
}
