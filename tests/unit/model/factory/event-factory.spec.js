import Config         from '@/config';
import EventFactory   from '@/model/factory/event-factory';
import EventValidator from '@/model/validators/event-validator';

describe('EventFactory', () => {
    it('should be able to generate a valid Event Object', () => {
        const event = EventFactory.createAudioEvent();
        expect(EventValidator.isValid(event)).toBe(true);
    });

    it('should be able to apply a valid module parameter automation Object to an event', () => {
        const event = EventFactory.createAudioEvent();
        event.mp = EventFactory.createModuleParam('foo', 10, true);

        expect(EventValidator.isValid(event)).toBe(true);
    });
});
