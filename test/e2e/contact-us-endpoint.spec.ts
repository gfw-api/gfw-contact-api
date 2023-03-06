import nock from 'nock';
import chai from 'chai';
import ChaiHttp from 'chai-http';
import { getTestServer } from './utils/test-server';
import config from 'config';
import { createClient, RedisClientType } from 'redis';

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const should = chai.should();

let requester: ChaiHttp.Agent;
const CHANNEL: string = config.get('redis.queueName');
let redisClient: RedisClientType;

describe('Contact us endpoint tests', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        process.on('unhandledRejection', (error) => should.fail(error.toString()));

        requester = await getTestServer();

        redisClient = createClient({ url: config.get('redis.url') });
        await redisClient.connect();
    });

    it('Calling the contact us endpoint returns 200 OK (happy case, minimum data)', async () => {
        let expectedQueueMessageCount = 2;

        const validateMailQueuedMessages = (resolve: (value: (PromiseLike<unknown> | unknown)) => void) => async (message: string) => {
            const jsonMessage = JSON.parse(message);
            jsonMessage.should.have.property('template');
            switch (jsonMessage.template) {

                case 'contact-form':
                    jsonMessage.should.have.property('data').and.deep.equal({
                        user_email: 'test@user.org',
                        topic: config.get('contactEmail.topics.general-inquiry.name'),
                        tool: config.get('contactEmail.tools.not-applicable.name'),
                        message: 'This is a test message',
                        subject: `Contact form: ${config.get('contactEmail.topics.general-inquiry.name')} for ${config.get('contactEmail.tools.not-applicable.name')}`
                    });
                    jsonMessage.should.have.property('recipients').and.deep.equal([{ address: config.get('contactEmail.tools.not-applicable.emailTo') }]);
                    break;
                case 'contact-form-confirmation':
                    jsonMessage.should.have.property('data').and.deep.equal({
                        user_email: 'test@user.org',
                        topic: config.get('contactEmail.topics.general-inquiry.name'),
                        tool: config.get('contactEmail.tools.not-applicable.name'),
                        message: 'This is a test message',
                        subject: `Contact form: ${config.get('contactEmail.topics.general-inquiry.name')} for ${config.get('contactEmail.tools.not-applicable.name')}`
                    });
                    jsonMessage.should.have.property('recipients').and.deep.equal([{ address: 'test@user.org' }]);
                    break;
                default:
                    should.fail('Unsupported message type: ', jsonMessage.template);
                    break;
            }

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
            .post(`/api/v1/form/contact-us`)
            .send({ email: 'test@user.org', message: 'This is a test message' });

        response.status.should.equal(200);
        response.body.should.eql({});

        return consumerPromise;
    });

    it('Calling the contact us endpoint returns 200 OK (happy case, custom topic and tool)', async () => {
        let expectedQueueMessageCount = 2;

        const validateMailQueuedMessages = (resolve: (value: (PromiseLike<unknown> | unknown)) => void) => async (message: string) => {
            const jsonMessage = JSON.parse(message);
            jsonMessage.should.have.property('template');
            switch (jsonMessage.template) {

                case 'contact-form':
                    jsonMessage.should.have.property('data').and.deep.equal({
                        user_email: 'test@user.org',
                        topic: config.get('contactEmail.topics.report-a-bug-or-error.name'),
                        tool: config.get('contactEmail.tools.fw.name'),
                        message: 'This is a test message',
                        subject: `Contact form: ${config.get('contactEmail.topics.report-a-bug-or-error.name')} for ${config.get('contactEmail.tools.fw.name')}`
                    });
                    jsonMessage.should.have.property('recipients').and.deep.equal([{ address: config.get('contactEmail.tools.fw.emailTo') }]);
                    break;
                case 'contact-form-confirmation':
                    jsonMessage.should.have.property('data').and.deep.equal({
                        user_email: 'test@user.org',
                        topic: config.get('contactEmail.topics.report-a-bug-or-error.name'),
                        tool: config.get('contactEmail.tools.fw.name'),
                        message: 'This is a test message',
                        subject: `Contact form: ${config.get('contactEmail.topics.report-a-bug-or-error.name')} for ${config.get('contactEmail.tools.fw.name')}`
                    });
                    jsonMessage.should.have.property('recipients').and.deep.equal([{ address: 'test@user.org' }]);
                    break;
                default:
                    should.fail('Unsupported message type: ', jsonMessage.template);
                    break;
            }

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
            .post(`/api/v1/form/contact-us`)
            .send({ email: 'test@user.org', message: 'This is a test message', topic: 'report-a-bug-or-error', tool: 'fw' });

        response.status.should.equal(200);
        response.body.should.eql({});

        return consumerPromise;
    });

    afterEach(async () => {
        await redisClient.unsubscribe(CHANNEL);
        redisClient.removeAllListeners();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        process.removeAllListeners('unhandledRejection');
    });
});
