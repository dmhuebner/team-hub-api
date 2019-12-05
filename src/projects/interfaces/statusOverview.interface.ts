import { ProjectStatus } from './projectStatus.interface';

export default interface StatusOverview {
  [key: string]: ProjectStatus;
}
