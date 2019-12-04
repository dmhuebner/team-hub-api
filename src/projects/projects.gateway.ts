import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WsResponse } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import Project from './project.interface';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(5005, { namespace: 'projects-monitor' })
export class ProjectsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  private logger: Logger = new Logger('ProjectsGateway');

  afterInit(server: Server) {
    this.logger.log('Initialized');
  }

  handleConnection(client: Socket, ...args): any {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): any {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('msgToServer')
  handleMessage(client: Socket, payload: Project[]): WsResponse<string> {
    this.logger.log('received msgToServer\n', JSON.stringify(payload));
    return {
      event: 'msgToClient',
      data: 'Hello from team-hub-api!\n' + payload,
    };
  }
}
