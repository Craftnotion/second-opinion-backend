import * as OneSignal from '@onesignal/node-onesignal';

const app_key_provider = {
  getToken() {
    return 'MzRjM2Q3ODQtNmU4Yy00ZWRmLTkwODMtZGJjMzEyYWJkODNm';
  },
};
const configuration = OneSignal.createConfiguration({
  authMethods: {
    
  },
});

const client = new OneSignal.DefaultApi(configuration);

export default client;
