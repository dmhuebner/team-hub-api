import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway, WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ProjectsService } from './projects.service';
import ProjectsMonitorConfig from './interfaces/projectsMonitorConfig.interface';
import { interval, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, map, shareReplay, startWith, takeUntil, tap } from 'rxjs/operators';
import { ProjectsConstants } from './projects.constants';
import Project from './interfaces/project.interface';
import LoginForToken from './interfaces/login-for-token.interface';

@WebSocketGateway(5005, { namespace: 'projects-monitor' })
export class ProjectsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  private logger: Logger = new Logger('ProjectsGateway');
  projectsSocket: Socket;
  @WebSocketServer() wsServer;
  unsubscribe$ = new Subject();
  stopTimer$ = new Subject();

  constructor(private projectsService: ProjectsService) {}

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

  @SubscribeMessage('msgToServer:monitor')
  handleProjectsConfigMsg(@MessageBody() projectConfigs: string): Observable<WsResponse<any>> {
    this.logger.log('received msgToServer\n');
    const parsedProjectConfigs: ProjectsMonitorConfig = JSON.parse(projectConfigs);
    if (this.projectsService.projectsMonitor$) {
      this.logger.debug('USING EXISTING MONITOR');
      return this.projectsService.projectsMonitor$;
    } else {
      this.logger.debug('MAKING NEW MONITOR\n');
      this.logger.debug(projectConfigs);
      const monitor$ = this.monitorProjects(
        parsedProjectConfigs.projects,
        parsedProjectConfigs.intervalLength,
        parsedProjectConfigs.loginForToken).pipe(
        tap(() => {
          const intervalLength = parsedProjectConfigs.intervalLength;
          this.stopTimer$.next(true);
          this.startHealthCheckCountdown(intervalLength);
        }),
        map(data => ({event: 'msgToClient:monitor', data})),
        tap(data => this.wsServer.emit(data)),
        shareReplay(1),
        takeUntil(this.unsubscribe$),
      );
      this.projectsService.setProjectsMonitor(monitor$);
      return monitor$;
    }
  }

  @SubscribeMessage('msgToServer:stopMonitor')
  handleStopMonitorMsg() {
    const data = 'Projects monitor stopped';
    this.unsubscribe$.next(true);
    this.projectsService.monitorUnsubscribe$.next(true);
    this.stopTimer$.next(true);
    this.projectsService.setProjectsMonitor(null);
    this.wsServer.emit('msgToClient:monitorCountdown', null);
    this.wsServer.emit('msgToClient:stopMonitor', data);
    this.logger.log('msgToClient:stopMonitor sent');
  }

  private monitorProjects(projects: Project[], intervalLength: number, loginConfig: LoginForToken): Observable<unknown> {
    this.logger.debug(`Monitoring projects for client every ${intervalLength} seconds.`);
    const minIntervalLength = ProjectsConstants.minMonitorInterval;
    // TODO - Make minimum intervalLength constant based on env (shorter for dev, longer for prod)
    if (intervalLength && intervalLength >= minIntervalLength) {
      return this.projectsService.monitorProjects(projects, intervalLength, loginConfig).pipe(
        tap(() => this.logger.log('msgToClient sent')),
        catchError(err => {
          this.logger.error('Monitor Error:');
          this.logger.error(err);
          return err;
        }),
      );
    } else {
      return of({
        error: `Interval length is too short. Must be at least ${minIntervalLength}.`,
        status: null,
      });
    }
  }

  private startHealthCheckCountdown(intervalLengthInSec: number) {
    let intervalLength = intervalLengthInSec;
    return interval(1000).pipe(
      startWith(() => intervalLength = this.tickCountdown(intervalLength)),
      tap(() => intervalLength = this.tickCountdown(intervalLength)),
      takeUntil(this.stopTimer$),
    ).subscribe();
  }

  private tickCountdown(intervalLength) {
    if (intervalLength >= 1) {
      intervalLength -= 1;
      this.wsServer.emit('msgToClient:monitorCountdown', intervalLength);
      return intervalLength;
    } else {
      this.stopTimer$.next(true);
    }
  }
}
