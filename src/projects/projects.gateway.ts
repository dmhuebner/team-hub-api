import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { HttpService, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ProjectsService } from './projects.service';
import ProjectsMonitorConfig from './interfaces/projectsMonitorConfig.interface';
import { forkJoin, from, interval, Observable, of } from 'rxjs';
import { catchError, map, mergeAll, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';
import HealthCheck from './interfaces/healthCheck.interface';
import Project from './interfaces/project.interface';

@WebSocketGateway(5005, { namespace: 'projects-monitor' })
export class ProjectsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  private logger: Logger = new Logger('ProjectsGateway');
  projectsSocket: Socket;

  constructor(private projectsService: ProjectsService,
              private http: HttpService) {}

  afterInit(server: Server) {
    this.logger.log('Initialized');
  }

  handleConnection(client: Socket, ...args): any {
    this.projectsSocket = client;
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): any {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('msgToServer')
  handleMessage(@MessageBody() projectConfigs: string): Observable<WsResponse<any>> {
    this.logger.log('received msgToServer\n' + projectConfigs);
    const parsedProjectConfigs: ProjectsMonitorConfig = JSON.parse(projectConfigs);
    this.logger.debug('received msgToServer\n' + JSON.stringify(parsedProjectConfigs.projects[0]));
    return this.monitorProjects(parsedProjectConfigs.projects, parsedProjectConfigs.intervalLength).pipe(
      map(data => ({event: 'msgToClient', data})),
    );
  }

  // initHealthCheckLoop(projectName: string, intervalLength: number, healthCheck: HealthCheck): Observable<any> {
  //   return interval(intervalLength).pipe(
  //     startWith(this.getHealthCheckStatus(projectName, healthCheck)),
  //     switchMap(() => this.getHealthCheckStatus(projectName, healthCheck)),
  //     shareReplay(1),
  //   );
  // }
  //
  // getHealthCheckStatus(projectName, healthCheck: HealthCheck): Observable<any> {
  //   return this.http.get(healthCheck.path).pipe(
  //     map(res => res),
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

  monitorProjects(projects: any, intervalLength: number): Observable<any> {
    this.logger.debug(`Monitoring projects for client every ${intervalLength} milliseconds.`);
    // TODO - Make minimum intervalLength constant based on env (shorter for dev, longer for prod)
    if (intervalLength && intervalLength >= 1000) {
      return this.projectsService.monitorProjects(projects, intervalLength).pipe(
        tap(() => this.logger.log('msgToClient sent')),
        catchError(err => {
          this.logger.debug(err);
          return err;
        }),
      );
    } else {
      return of({
        body: 'You must set the intervalLength first. Send intervalLength in number of seconds to "msgToServer:setInterval".',
        status: null,
      });
    }
  }
}
