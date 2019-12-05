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
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@WebSocketGateway(5005, { namespace: 'projects-monitor' })
export class ProjectsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  private logger: Logger = new Logger('ProjectsGateway');
  projectsSocket: Socket;

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

  @SubscribeMessage('msgToServer')
  handleMessage(@MessageBody() projectConfigs: string): Observable<WsResponse<any>> {
    this.logger.log('received msgToServer\n' + projectConfigs);
    const parsedProjectConfigs: ProjectsMonitorConfig = JSON.parse(projectConfigs);
    this.logger.debug('received msgToServer\n' + JSON.stringify(parsedProjectConfigs.projects[0]));
    return this.monitorProjects(parsedProjectConfigs.projects, parsedProjectConfigs.intervalLength).pipe(
      map(data => ({event: 'msgToClient', data})),
    );
  }

  monitorProjects(projects: any, intervalLength: number): Observable<unknown> {
    this.logger.debug(`Monitoring projects for client every ${intervalLength} milliseconds.`);
    const minIntervalLength = 5000;
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
}
