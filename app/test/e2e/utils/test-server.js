const chai = require('chai');
const chaiHttp = require('chai-http');

let requester;

chai.use(chaiHttp);

exports.getTestServer = async function getTestServer() {
    if (requester) {
        return requester;
    }

    // eslint-disable-next-line global-require
    const serverPromise = require('../../../src/app');
    const { server } = await serverPromise();
    requester = chai.request(server).keepOpen();

    return requester;
};
