import nock from 'nock';
import chai from 'chai';
import sinon from 'sinon';
import ChaiHttp from 'chai-http';
import GoogleSheetsService from 'services/googleSheets.service';
import { getTestServer } from './utils/test-server';

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

chai.should();

let requester: ChaiHttp.Agent;
let sinonSandbox: sinon.SinonSandbox;

describe('Contact us endpoint tests', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    beforeEach(() => {
        sinonSandbox = sinon.createSandbox();
    });

    it('Calling the contact us endpoint returns 200 OK (happy case)', async () => {
        sinonSandbox.stub(GoogleSheetsService, 'authSheets')
            .callsFake(() => new Promise((resolve) => resolve(null)));
        sinonSandbox.stub(GoogleSheetsService, 'updateSheet')
            .callsFake(() => new Promise((resolve) => resolve(null)));

        const response = await requester.post(`/api/v1/form/contact-us`).send({ tool: 'gfw' });
        response.status.should.equal(200);
        response.body.should.eql({});
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        sinonSandbox.restore();
    });
});
