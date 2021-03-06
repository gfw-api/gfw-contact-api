const logger = require('logger');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const { RWAPIMicroservice } = require('rw-api-microservice-node');

const deserializer = (obj) => (callback) => {
    new JSONAPIDeserializer({ keyForAttribute: 'camelCase' }).deserialize(obj, callback);
};

class UserService {

    // eslint-disable-next-line class-methods-use-this
    * getUserLanguage(loggedUser) {
        if (loggedUser) {
            logger.info('Obtaining user', `/v1/user/${loggedUser.id}`);
            try {
                const result = yield RWAPIMicroservice.requestToMicroservice({
                    uri: `/v1/user/${loggedUser.id}`,
                    method: 'GET',
                    json: true
                });
                const user = yield deserializer(result);
                if (user && user.language) {
                    const language = user.language.toLowerCase().replace(/_/g, '-');
                    logger.info('Setting user language to send email', language);
                    return language;
                }
            } catch (e) {
                logger.error('error obtaining user, default lang en', e);
                return 'en';

            }
        }
        logger.info('User not logged, default lang en');
        return 'en';
    }

}

module.exports = new UserService();
