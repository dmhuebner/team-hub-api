import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ProjectsService } from './projects.service';
import ProjectsMonitorConfig from './interfaces/projectsMonitorConfig.interface';
import { interval, Observable, of, Subject } from 'rxjs';
import { catchError, map, startWith, takeUntil, tap } from 'rxjs/operators';
import { ProjectsConstants } from './projects.constants';

@WebSocketGateway(5005, { namespace: 'projects-monitor' })
export class ProjectsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  private logger: Logger = new Logger('ProjectsGateway');
  projectsSocket: Socket;
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
    this.unsubscribe$.next(true);
    this.stopTimer$.next(true);
  }

  @SubscribeMessage('msgToServer:monitor')
  handleProjectsConfigMsg(@MessageBody() projectConfigs: string): Observable<WsResponse<any>> {
    this.logger.debug('received msgToServer\n' + projectConfigs);
    const parsedProjectConfigs: ProjectsMonitorConfig = JSON.parse(projectConfigs);
    return this.monitorProjects(parsedProjectConfigs.projects, parsedProjectConfigs.intervalLength).pipe(
      tap(() => {
        const intervalLength = parsedProjectConfigs.intervalLength;
        this.stopTimer$.next(true);
        this.startHealthCheckCountdown(intervalLength);
      }),
      map(data => ({event: 'msgToClient:monitor', data})),
      takeUntil(this.unsubscribe$),
    );
  }

  @SubscribeMessage('msgToServer:stopMonitor')
  handleStopMonitorMsg(): WsResponse<string> {
    const data = 'Projects monitor stopped';
    this.unsubscribe$.next(true);
    this.stopTimer$.next(true);
    this.logger.log('msgToClient:stopMonitor sent');
    this.projectsSocket.emit('msgToClient:monitorCountdown', null);
    return {event: 'msgToClient:stopMonitor', data};
  }

  private monitorProjects(projects: any, intervalLength: number): Observable<unknown> {
    this.logger.debug(`Monitoring projects for client every ${intervalLength} milliseconds.`);
    const minIntervalLength = ProjectsConstants.minMonitorInterval;
    // TODO - Make minimum intervalLength constant based on env (shorter for dev, longer for prod)
    if (intervalLength && intervalLength >= minIntervalLength) {
      return this.projectsService.monitorProjects(projects, intervalLength).pipe(
        tap(() => this.logger.log('msgToClient sent')),
        catchError(err => {
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

  private startHealthCheckCountdown(intervalLengthInMs: number) {
    let intervalLength = intervalLengthInMs;
    return interval(1000).pipe(
      startWith(() => intervalLength = this.tickCountdown(intervalLength)),
      tap(() => intervalLength = this.tickCountdown(intervalLength)),
      takeUntil(this.stopTimer$),
    ).subscribe();
  }

  private tickCountdown(intervalLength) {
    if (intervalLength >= 1000) {
      intervalLength -= 1000;
      this.projectsSocket.emit('msgToClient:monitorCountdown', intervalLength);
      return intervalLength;
    } else {
      this.stopTimer$.next(true);
    }
  }
}
