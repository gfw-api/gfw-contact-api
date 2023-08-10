import nock from 'nock';
import chai from 'chai';
import config from 'config';
import { createClient, RedisClientType } from 'redis';
import ChaiHttp from 'chai-http';
import { getTestServer } from './utils/test-server';
import { mockValidateRequestWithApiKey } from './utils/helpers';

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const should = chai.should();

let requester: ChaiHttp.Agent;
const CHANNEL: string = config.get('redis.queueName');
let redisClient: RedisClientType;

describe('Request webinar endpoint tests', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        process.on('unhandledRejection', (error) => should.fail(error.toString()));

        requester = await getTestServer();

        redisClient = createClient({ url: config.get('redis.url') });
        await redisClient.connect();
    });

    it('Name is required when trying to create a new webinar request', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/form/request-webinar`)
            .set('x-api-key', 'api-key-test')
            .set('Content-Type', 'application/json')
            .send();

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.have.length(1);
        response.body.errors[0].should.have.property('status').and.equal(400);
        response.body.errors[0].should.have.property('detail').and.equal('"name" is required');
    });

    it('Email is required when trying to create a new webinar request', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/form/request-webinar`)
            .set('x-api-key', 'api-key-test')
            .set('Content-Type', 'application/json')
            .send({ name: 'Test' });

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('status', 400);
        response.body.errors[0].should.have.property('detail', '"email" is required');
    });

    it('A correctly formatted email is required when trying to create a new webinar request', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/form/request-webinar`)
            .set('x-api-key', 'api-key-test')
            .set('Content-Type', 'application/json')
            .send({
                name: 'Test',
                email: 'test',
            });

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('status', 400);
        response.body.errors[0].should.have.property('detail', '"email" must be a valid email');
    });

    it('A request text is required when trying to create a new webinar request', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/form/request-webinar`)
            .set('x-api-key', 'api-key-test')
            .set('Content-Type', 'application/json')
            .send({
                name: 'Test',
                email: 'test@email.com',
            });

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('status', 400);
        response.body.errors[0].should.have.property('detail', '"request" is required');
    });

    it('A request for a webinar should queue an email (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const requestData = {
            name: 'Test',
            email: 'example@gmail.com',
            request: 'Webinar request test',
        };

        let expectedQueueMessageCount = 1;

        const validateMailQueuedMessages = (resolve: (value: (PromiseLike<unknown> | unknown)) => void) => async (message: string) => {
            const jsonMessage = JSON.parse(message);
            jsonMessage.should.have.property('template').and.equal(config.get('requestWebinarEmail.template'));
            jsonMessage.should.have.property('data').and.deep.equal({
                name: 'Test',
                user_email: 'example@gmail.com',
                request: 'Webinar request test',
            });
            jsonMessage.should.have.property('recipients').and.deep.equal([{ address: config.get('requestWebinarEmail.emailTo') }]);

            expectedQueueMessageCount -= 1;

            if (expectedQueueMessageCount < 0) {
                throw new Error(`Unexpected message count - expectedQueueMessageCount:${expectedQueueMessageCount}`);
            }

            if (expectedQueueMessageCount === 0) {
                resolve(null);
            }
        };

        const consumerPromise = new Promise((resolve) => {
            redisClient.subscribe(CHANNEL, validateMailQueuedMessages(resolve));
        })

        const response = await requester
            .post(`/api/v1/form/request-webinar`)
            .set('x-api-key', 'api-key-test')
            .set('Content-Type', 'application/json')
            .send(requestData);
        response.status.should.equal(204);

        return consumerPromise;
    });

    afterEach(async () => {
        redisClient.removeAllListeners();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        process.removeAllListeners('unhandledRejection');
    });
});
