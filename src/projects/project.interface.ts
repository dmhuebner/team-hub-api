import Healthcheck from './healthcheck.interface';

export default interface Project {
  name: string;
  description: string;
  appType: string; // should be an enum?
  uiPath: string;
  healthCheck: Healthcheck;
  dependencies: Project[];
}

// "projects": [
//   {
//     "name": "Pomodor",
//     "description": "Time keeping and task list app that uses the pomodoro technique",
//     "appType": "UI",
//     "uiPath": "https://pomodor.herokuapp.com/home",
//     "healthCheck": {
//       "path": "https://api.github.com/users/octocat",
//       "successStatuses": [200]
//     },
//     "dependencies": [
//       {
//         "name": "some-api",
//         "description": "Some API that does important stuff",
//         "appType": "API",
//         "healthCheck": {
//           "path": "https://api.github.com/users/octocat",
//           "successStatuses": [200]
//         },
//         "dependencies": [
//           {
//             "name": "another-api",
//             "description": "Another API that does other stuff",
//             "appType": "API",
//             "healthCheck": {
//               "path": "https://another-api.com/health",
//               "successStatuses": [200]
//             },
//             "dependencies": []
//           }
//         ]
//       },
//       {
//         "name": "github-api",
//         "description": "Github API that does other stuff",
//         "appType": "API",
//         "healthCheck": {
//           "path": "https://api.github.com/users/octocat",
//           "successStatuses": [200]
//         },
//         "dependencies": []
//       }
//     ]
//   },
//   {
//     "name": "Other Thing",
//     "description": "Some other thing that uses the pomodoro technique",
//     "uiPath": "https://other-thing.herokuapp.com/home",
//     "healthCheck": {
//       "path": "https://api.github.com/users/octocat",
//       "successStatuses": [
//         200
//       ]
//     },
//     "dependencies": []
//   },
//   {
//     "name": "And Another Thing",
//     "description": "Some other thing that uses the pomodoro technique",
//     "uiPath": "https://other-thing.herokuapp.com/home",
//     "healthCheck": {
//       "path": "https://api.github.com/users/octocat",
//       "successStatuses": [
//         200
//       ]
//     },
//     "dependencies": [
//       {"name":"mke syeigrf wlv","description":"ddud boxni rauwc mpko ysit xho qhdpcdhr aiyasej","uiPath":"https://ddfjjfilfmfrppxdublipwhds/mhd","healthCheck":{"path":"https://api.github.com/users/octocat","successStatuses":[200]},"dependencies":[]}
//     ]
//   }
// ]
// }
