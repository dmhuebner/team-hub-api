import { HttpException, HttpService, Injectable, Logger } from '@nestjs/common';
import Project from './interfaces/project.interface';
import HealthCheck from './interfaces/healthCheck.interface';
import { BehaviorSubject, forkJoin, from, interval, Observable, of, Subject } from 'rxjs';
import { catchError, combineLatest, map, shareReplay, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';

@Injectable()
export class ProjectsService {

  constructor(private http: HttpService) {}

  logger: Logger = new Logger('ProjectsService');

  // monitor(projects: Project[]) {
  //   return projects;
  // }

  // initHealthCheckLoop(projectName: string, intervalLength: number, healthCheck: HealthCheck): Observable<any> {
  //   // return interval(intervalLength).pipe(
  //   //   startWith(this.getHealthCheckStatus(projectName, healthCheck)),
  //   //   switchMap(() => this.getHealthCheckStatus(projectName, healthCheck)),
  //   //   shareReplay(1),
  //   // );
  //   return this.getHealthCheckStatus(projectName, healthCheck);
  // }
  //
  // getHealthCheckStatus(projectName, healthCheck: HealthCheck): Observable<any> {
  //   return this.http.get(healthCheck.path).pipe(
  //     map(res => ({body: res.data, status: res.status})),
  //     catchError(errResp => {
  //       return of(errResp);
  //     }),
  //   );
  // }
  //
  // getAllHealthChecks(projectsConfig: Project[], intervalLength: number, healthCheckCalls = []) {
  //   projectsConfig.forEach(projConfig => {
  //     healthCheckCalls.push(this.initHealthCheckLoop(projConfig.name, intervalLength, projConfig.healthCheck));
  //     if (projConfig.dependencies && projConfig.dependencies.length) {
  //       this.getAllHealthChecks(projConfig.dependencies, intervalLength, healthCheckCalls);
  //     }
  //   });
  //   return healthCheckCalls;
  // }

  monitorProjects(projects: Project[], intervalLength: number): Observable<any> {
    // const healthChecks = this.getAllHealthChecks(projects, intervalLength);
    // return forkJoin(...healthChecks);
    this.logger.debug('intervalLength: ' + String(intervalLength));
    this.logger.debug(projects);
    return interval(intervalLength).pipe(
      startWith(() => this.getHealthCheck(projects[0].healthCheck.path)),
      switchMap(() => this.getHealthCheck(projects[0].healthCheck.path)),
    );
  }

  getHealthCheck(path: string): any | Observable<any> {
    return this.http.get(path).pipe(
      tap(res => this.logger.debug(JSON.stringify(res.status))),
      map(res => ({body: res.data, status: res.status})),
      catchError(err => {
        const body = err && err.message ? err.message : err;
        const splitErrorMessage = err && err.message && err.message.split(' ').length ? err.message.split(' ') : [];
        let status = Number(splitErrorMessage[splitErrorMessage.length - 1]);
        if (!err.message.includes(('status code').toLowerCase()) || isNaN(status)) {
          // If message does not include 'status code' text or if last word is not a status - set status to null;
          status = null;
        }
        return of({ body, status });
      }),
    );
  }
}
