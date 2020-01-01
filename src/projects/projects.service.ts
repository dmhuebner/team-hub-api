import { HttpService, Injectable, Logger } from '@nestjs/common';
import Project from './interfaces/project.interface';
import { BehaviorSubject, forkJoin, interval, Observable, of, Subject } from 'rxjs';
import { catchError, distinct, map, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import HealthCheckStatus from './interfaces/healthCheckStatus.interface';
import HealthCheck from './interfaces/healthCheck.interface';
import StatusOverview from './interfaces/statusOverview.interface';
import { ProjectStatus } from './interfaces/projectStatus.interface';
import CustomAxiosRequestConfig from './interfaces/customAxiosRequestConfig.interface';
import { WsResponse } from '@nestjs/websockets';
import HealthCheckSuccessCriteria from './interfaces/health-check-success-criteria.interface';
import JsonContainsMap from './interfaces/json-contains-map.interface';
import LoginForToken from './interfaces/login-for-token.interface';
import HttpConfig from './interfaces/http-config.interface';

@Injectable()
export class ProjectsService {

  private logger: Logger = new Logger('ProjectsService');
  projectsMonitor$: Observable<WsResponse>;
  monitorUnsubscribe$ = new Subject();
  currentGeneralTokenSubject = new BehaviorSubject<string>('');
  currentGeneralToken$: Observable<string> = this.currentGeneralTokenSubject.asObservable();
  currentGeneralToken: string;

  constructor(private http: HttpService) {}

  // Projects Monitor entry point
  monitorProjects(projects: Project[], intervalLength: number, loginConfig: LoginForToken): Observable<StatusOverview> {
    return interval(intervalLength).pipe(
      startWith(() => this.runHealthCheckSequence(projects, loginConfig)),
      switchMap(() => this.runHealthCheckSequence(projects, loginConfig)),
      takeUntil(this.monitorUnsubscribe$),
    );
  }

  setProjectsMonitor(monitor$: Observable<any>) {
    this.projectsMonitor$ = monitor$;
  }

  // 1) Gets a token if there is a loginForToken config.
  // 2) Get responses for all health checks.
  // 3) Build a Status Overview object to return
  private runHealthCheckSequence(projects: Project[], loginConfig: LoginForToken): Observable<any> {
    return this.getToken(loginConfig).pipe(
      switchMap(() => this.getAllHealthChecks(projects)),
      map((healthCheckStatuses: HealthCheckStatus[]) => this.getStatusOverview(healthCheckStatuses, projects)),
      tap(f => this.logger.debug('MONITORING: ')),
      tap(f => this.logger.debug('GENERAL TOKEN set: ' + this.currentGeneralToken)),
    );
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
    return forkJoin(healthCheckCalls).pipe(distinct((hc) => hc.projectName));
  }

  // Makes an individual healthCheck call and returns an Observable of a HealthCheckStatus
  private getHealthCheck(healthCheck: HealthCheck, projectName: string): Observable<HealthCheckStatus> {
    const timestamp = new Date().toISOString();
    const token = healthCheck.useGeneralToken ? this.currentGeneralToken : null;
    const warning = null;
    let up = false;
    return this.getHttpCall(healthCheck, token).pipe(
      map((res): HealthCheckStatus => {
        // Check successCriteria
        const successCriteriaCheck: SuccessCriteriaCheck = this.checkSuccessCriteria(healthCheck.successCriteria, res.status, res.data);
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
        const successCriteriaCheck: SuccessCriteriaCheck = this.checkSuccessCriteria(healthCheck.successCriteria, status, err.message);
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

  // Build up a StatusOverview object that matches the same project/dependency hierarchy as the projects config
  // by matching the statuses to their projects
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

  private getHttpCall(httpConfig: HttpConfig, token?: string): Observable<any> {
    const config: CustomAxiosRequestConfig = {};
    if (httpConfig.headers) {
      config.headers = httpConfig.headers;
    } else {
      config.headers = {};
    }

    // Set the currentGeneralToken to be used for authorization if there is one
    if (token) {
      // TODO make Bearer token type dynamic - type property is already on loginForToken config object
      config.headers.Authorization = `Bearer ${token}`;
    }

    // this.logger.debug('CONFIG');
    // this.logger.debug(httpConfig.path);
    // this.logger.debug(config);

    switch (httpConfig.method.toLowerCase()) {
      case 'post':
        return this.http.post(httpConfig.path, httpConfig.requestBody, config);
      case 'put':
        return this.http.put(httpConfig.path, httpConfig.requestBody, config);
      default:
        return this.http.get(httpConfig.path, config);
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

  // This function is used for matching certain property values with certain properties on a health check response body
  // It takes a list of JsonContainMaps that have a "property" prop to specify where in the object to find the expected value
  // It also takes an objectToSearch which is the object (in our case the response body) that we want to search through
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

  // Get a general login token to be used with certain specified health checks
  private getToken(loginConfig: LoginForToken): Observable<any> {
    return this.getHttpCall(loginConfig).pipe(
      // tap(getTokenResp => {this.logger.debug('getTokenResp'); this.logger.debug(getTokenResp.data); }),
      map(getTokenResponse => this.getTokenFromObject(getTokenResponse.data, loginConfig)),
      tap(token => {
        this.currentGeneralTokenSubject.next(token);
        this.currentGeneralToken = token;
      }),
      catchError(err => of(this.logger.error(err))),
    );
  }

  private getTokenFromObject(tokenResponse: any, loginConfig: LoginForToken): string {
    if (!loginConfig.tokenLocationInResponse) {
      return tokenResponse;
    } else {
      return this.actOnObjectProperty(tokenResponse, loginConfig.tokenLocationInResponse, (propertyValue) => {
        return propertyValue;
      });
    }
  }

  private actOnObjectProperty(objectToActOn: any, propertyTrace: string, callback: (propertyValue: any, directParentObj: any) => any): any {
    if (propertyTrace.indexOf('.') !== -1) {
      let propertyValue;
      let parentObject;
      const nestedProps = propertyTrace.split('.');
      nestedProps.reduce((obj, prop, i) => {
        if (nestedProps.length === i + 1) {
          propertyValue = obj[prop];
          parentObject = obj;
        }
        return obj[prop];
      }, objectToActOn);
      return callback(propertyValue, parentObject);
    } else {
      return callback(objectToActOn[propertyTrace], objectToActOn);
    }
  }
}

interface SuccessCriteriaCheck {
  up: boolean;
  invalidResponseBody: boolean;
}
