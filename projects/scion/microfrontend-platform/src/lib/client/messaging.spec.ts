/*
 * Copyright (c) 2018-2019 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */
import { Beans } from '../bean-manager';
import { PlatformMessageClient } from '../host/platform-message-client';
import { first, publishReplay, reduce, take, timeoutWith } from 'rxjs/operators';
import { ConnectableObservable, Observable, throwError } from 'rxjs';
import { IntentMessage, MessageHeaders, TopicMessage } from '../messaging.model';
import { MessageClient } from './message-client';
import { Logger } from '../logger';
import { ManifestRegistry } from '../host/manifest.registry';
import { ApplicationConfig } from '../host/platform-config';
import { PLATFORM_SYMBOLIC_NAME } from '../host/platform.constants';
import { expectToBeRejectedWithError, expectToBeResolvedToMapContaining, serveManifest } from '../spec.util.spec';
import { MicrofrontendPlatform } from '../microfrontend-platform';
import { Defined, Objects } from '@scion/toolkit/util';
import Spy = jasmine.Spy;

const bodyExtractFn = <T>(msg: TopicMessage<T> | IntentMessage<T>): T => msg.body;
const headersExtractFn = <T>(msg: TopicMessage<T> | IntentMessage<T>): Map<string, any> => msg.headers;

/**
 * Tests most important and fundamental features of the messaging facility with a single client, the host-app, only.
 *
 * More advanced and deeper testing with having multiple, cross-origin clients connected, is done end-to-end with Protractor against the testing app.
 *
 * See `messaging.e2e-spec.ts` for end-to-end tests.
 */
describe('Messaging', () => {

  beforeEach(async () => await MicrofrontendPlatform.destroy());
  afterEach(async () => await MicrofrontendPlatform.destroy());

  it('should allow publishing messages to a topic', async () => {
    await MicrofrontendPlatform.forHost([]);

    const actual$ = Beans.get(PlatformMessageClient).observe$<string>('some-topic');
    const actual = collectToPromise(actual$, {take: 3, projectFn: bodyExtractFn});

    Beans.get(PlatformMessageClient).publish$('some-topic', 'A').subscribe();
    Beans.get(PlatformMessageClient).publish$('some-topic', 'B').subscribe();
    Beans.get(PlatformMessageClient).publish$('some-topic', 'C').subscribe();

    await expectAsync(actual).toBeResolvedTo(['A', 'B', 'C']);
  });

  it('should allow issuing an intent', async () => {
    const manifestUrl = serveManifest({name: 'Host Application', capabilities: [{type: 'some-capability'}]});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app'});

    const actual$ = Beans.get(MessageClient).handleIntent$<string>();
    const actual = collectToPromise(actual$, {take: 1, projectFn: bodyExtractFn});

    Beans.get(MessageClient).issueIntent$({type: 'some-capability'}, 'payload').subscribe();

    await expectAsync(actual).toBeResolvedTo(['payload']);
  });

  it('should allow passing headers when publishing a message', async () => {
    await MicrofrontendPlatform.forHost([]);

    const actual$ = Beans.get(PlatformMessageClient).observe$('some-topic');
    const actual = collectToPromise(actual$, {take: 1, projectFn: headersExtractFn}).then(takeFirstElement);

    Beans.get(PlatformMessageClient).publish$('some-topic', undefined, {headers: new Map().set('header1', 'value').set('header2', 42)}).subscribe();
    await expectToBeResolvedToMapContaining(actual, new Map().set('header1', 'value').set('header2', 42));
  });

  it('should allow passing headers when issuing an intent', async () => {
    const manifestUrl = serveManifest({name: 'Host Application', capabilities: [{type: 'some-capability'}]});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app'});

    const actual$ = Beans.get(MessageClient).handleIntent$();
    const actual = collectToPromise(actual$, {take: 1, projectFn: headersExtractFn}).then(takeFirstElement);

    Beans.get(MessageClient).issueIntent$({type: 'some-capability'}, undefined, {headers: new Map().set('header1', 'value').set('header2', 42)}).subscribe();
    await expectToBeResolvedToMapContaining(actual, new Map().set('header1', 'value').set('header2', 42));
  });

  it('should return an empty headers dictionary if no headers are set', async () => {
    await MicrofrontendPlatform.forHost([]);

    const actual$ = Beans.get(PlatformMessageClient).observe$('some-topic');
    const actual = collectToPromise(actual$, {take: 1, projectFn: headersExtractFn}).then(takeFirstElement);

    Beans.get(PlatformMessageClient).publish$('some-topic', 'payload').subscribe();
    await expectToBeResolvedToMapContaining(actual, new Map());
  });

  it('should allow passing headers when sending a request', async () => {
    await MicrofrontendPlatform.forHost([]);

    Beans.get(PlatformMessageClient).observe$('some-topic').subscribe(msg => {
      const replyTo = msg.headers.get(MessageHeaders.ReplyTo);
      Beans.get(PlatformMessageClient).publish$(replyTo, undefined, {headers: new Map().set('reply-header', msg.headers.get('request-header').toUpperCase())}).subscribe();
    });

    const ping$ = Beans.get(PlatformMessageClient).request$('some-topic', undefined, {headers: new Map().set('request-header', 'ping')});
    const actual = collectToPromise(ping$, {take: 1, projectFn: headersExtractFn}).then(takeFirstElement);

    await expectToBeResolvedToMapContaining(actual, new Map().set('reply-header', 'PING'));
  });

  it('should allow passing headers when sending an intent request', async () => {
    const manifestUrl = serveManifest({name: 'Host Application', capabilities: [{type: 'some-capability'}]});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app'});

    Beans.get(MessageClient).handleIntent$().subscribe(intent => {
      const replyTo = intent.headers.get(MessageHeaders.ReplyTo);
      Beans.get(MessageClient).publish$(replyTo, undefined, {headers: new Map().set('reply-header', intent.headers.get('request-header').toUpperCase())}).subscribe();
    });

    const ping$ = Beans.get(MessageClient).requestByIntent$({type: 'some-capability'}, undefined, {headers: new Map().set('request-header', 'ping')});
    const actual = collectToPromise(ping$, {take: 1, projectFn: headersExtractFn}).then(takeFirstElement);

    await expectToBeResolvedToMapContaining(actual, new Map().set('reply-header', 'PING'));
  });

  it('should transport a topic message to both, the platform client and the host client, respectively', async () => {
    const manifestUrl = serveManifest({name: 'Host Application'});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app'});

    const messagesReceivedByPlatformMessageClient = collectToPromise(Beans.get(PlatformMessageClient).observe$('some-topic'), {take: 2, projectFn: bodyExtractFn});
    const messagesReceivedByHostMessageClient = collectToPromise(Beans.get(MessageClient).observe$('some-topic'), {take: 2, projectFn: bodyExtractFn});

    await expectAsync(waitUntilSubscriberCount('some-topic', 2)).toBeResolved();
    await Beans.get(PlatformMessageClient).publish$('some-topic', 'A').subscribe();
    await Beans.get(MessageClient).publish$('some-topic', 'B').subscribe();

    await expectAsync(messagesReceivedByPlatformMessageClient).toBeResolvedTo(['A', 'B']);
    await expectAsync(messagesReceivedByHostMessageClient).toBeResolvedTo(['A', 'B']);
  });

  it('should allow receiving a reply for a request', async () => {
    await MicrofrontendPlatform.forHost([]);

    Beans.get(PlatformMessageClient).observe$<string>('some-topic').subscribe(msg => {
      const replyTo = msg.headers.get(MessageHeaders.ReplyTo);
      Beans.get(PlatformMessageClient).publish$(replyTo, msg.body.toUpperCase()).subscribe();
    });

    const ping$ = Beans.get(PlatformMessageClient).request$<string>('some-topic', 'ping');
    const actual = collectToPromise(ping$, {take: 1, projectFn: bodyExtractFn});

    await expectAsync(actual).toBeResolvedTo(['PING']);
  });

  it('should allow receiving a reply for an intent request', async () => {
    const manifestUrl = serveManifest({name: 'Host Application', capabilities: [{type: 'some-capability'}]});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app'});

    Beans.get(MessageClient).handleIntent$<string>().subscribe(intent => {
      const replyTo = intent.headers.get(MessageHeaders.ReplyTo);
      Beans.get(MessageClient).publish$(replyTo, intent.body.toUpperCase()).subscribe();
    });

    const ping$ = Beans.get(MessageClient).requestByIntent$({type: 'some-capability'}, 'ping');
    const actual = collectToPromise(ping$, {take: 1, projectFn: bodyExtractFn});
    await expectAsync(actual).toBeResolvedTo(['PING']);
  });

  it('should reject a client connect attempt if the app is not registered', async () => {
    const manifestUrl = serveManifest({name: 'Trusted Client'});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'trusted-client', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'untrusted-client'});

    const expected = '[MessageClientConnectError] Client connect attempt rejected by the message broker: Unknown client. [app=\'untrusted-client\'] [code: \'refused:rejected\']';
    await expectAsync(Beans.get(MessageClient).publish$('some-topic').toPromise()).toBeRejectedWith(expected);
  });

  it('should reject a client connect attempt if the app is not trusted (wrong origin)', async () => {
    const loggerSpy = jasmine.createSpyObj(Logger.name, ['error', 'info']);
    Beans.register(Logger, {useValue: loggerSpy});

    const manifestUrl = serveManifest({name: 'Trusted Client', baseUrl: 'http://not-karma-testrunner-origin'});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'client', manifestUrl: manifestUrl}];
    const logCapturePromise = waitUntilInvoked(loggerSpy.error);

    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'client'});

    await expectAsync(logCapturePromise).toBeResolved('\'Logger.error\' not invoked within 1s');
    await expect(loggerSpy.error.calls.mostRecent().args[0]).toMatch(/\[MessageClientConnectError] Client connect attempt blocked by the message broker: Wrong origin.*\[code: 'refused:blocked']/);
  });

  it('should log an error if the message broker cannot be discovered', async () => {
    const loggerSpy = jasmine.createSpyObj(Logger.name, ['error', 'info']);
    Beans.register(Logger, {useValue: loggerSpy});
    const logCapturePromise = waitUntilInvoked(loggerSpy.error);

    await MicrofrontendPlatform.forClient({symbolicName: 'client-app', messaging: {brokerDiscoverTimeout: 250}});

    await expectAsync(logCapturePromise).toBeResolved();
    await expect(loggerSpy.error).toHaveBeenCalledWith('[BrokerDiscoverTimeoutError] Message broker not discovered within the 250ms timeout. Messages cannot be published or received.');
  });

  it('should throw an error when publishing a message and if the message broker is not discovered', async () => {
    await MicrofrontendPlatform.forClient({symbolicName: 'client-app', messaging: {brokerDiscoverTimeout: 250}});
    await expectToBeRejectedWithError(Beans.get(MessageClient).publish$('some-topic').toPromise(), /BrokerDiscoverTimeoutError/);
  });

  describe('Separate registries for the platform and the host client app', () => {

    it('should dispatch an intent only to the platform message client', async () => {
      const manifestUrl = serveManifest({name: 'Host Application'});
      const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
      await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app', messaging: {brokerDiscoverTimeout: 250}});

      // Register a platform capability. Intents should not be received by the host-app message client.
      Beans.get(ManifestRegistry).registerCapability(PLATFORM_SYMBOLIC_NAME, [{type: 'some-capability'}]);
      const intentsReceivedByPlatformMessageClient = collectToPromise(Beans.get(PlatformMessageClient).handleIntent$(), {take: 1, projectFn: bodyExtractFn});
      const intentsReceivedByHostMessageClient = collectToPromise(Beans.get(MessageClient).handleIntent$(), {take: 1, projectFn: bodyExtractFn});

      // Issue the intent via platform message client.
      await Beans.get(PlatformMessageClient).issueIntent$({type: 'some-capability'}).subscribe();

      // Verify host-app message client not receiving the intent.
      await expectAsync(intentsReceivedByPlatformMessageClient).toBeResolved();
      await expectAsync(intentsReceivedByHostMessageClient).toBeRejected();

      // Verify host-app message client not allowed to issue the intent.
      await expectToBeRejectedWithError(Beans.get(MessageClient).issueIntent$({type: 'some-capability'}).toPromise(), /NotQualifiedError/);
    });

    it('should dispatch an intent only to the host-app message client', async () => {
      const manifestUrl = serveManifest({name: 'Host Application'});
      const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
      await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app', messaging: {brokerDiscoverTimeout: 250}});

      // Register a host-app capability. Intents should not be received by the platform message client.
      Beans.get(ManifestRegistry).registerCapability('host-app', [{type: 'some-host-app-capability'}]);
      const intentsReceivedByPlatformMessageClient = collectToPromise(Beans.get(PlatformMessageClient).handleIntent$(), {take: 1, projectFn: bodyExtractFn});
      const intentsReceivedByHostMessageClient = collectToPromise(Beans.get(MessageClient).handleIntent$(), {take: 1, projectFn: bodyExtractFn});

      // Issue the intent via host-app message client.
      await Beans.get(MessageClient).issueIntent$({type: 'some-host-app-capability'}).subscribe();

      // Verify platform message client not receiving the intent.
      await expectAsync(intentsReceivedByPlatformMessageClient).toBeRejected();
      await expectAsync(intentsReceivedByHostMessageClient).toBeResolved();

      // Verify platform message client not allowed to issue the intent.
      await expectToBeRejectedWithError(Beans.get(PlatformMessageClient).issueIntent$({type: 'some-host-app-capability'}).toPromise(), /NotQualifiedError/);
    });
  });

  it('should allow multiple subscriptions to the same topic in the same client', async () => {
    const manifestUrl = serveManifest({name: 'Host Application'});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app', messaging: {brokerDiscoverTimeout: 250}});

    const receiver1$ = Beans.get(MessageClient).observe$<string>('topic').pipe(publishReplay(1)) as ConnectableObservable<TopicMessage<string>>;
    const receiver2$ = Beans.get(MessageClient).observe$<string>('topic').pipe(publishReplay(1)) as ConnectableObservable<TopicMessage<string>>;
    const receiver3$ = Beans.get(MessageClient).observe$<string>('topic').pipe(publishReplay(1)) as ConnectableObservable<TopicMessage<string>>;

    const subscription1 = receiver1$.connect();
    const subscription2 = receiver2$.connect();
    const subscription3 = receiver3$.connect();

    // publish 'message 1a'
    await Beans.get(MessageClient).publish$('topic', 'message 1a', {retain: true}).toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'message 1a'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'message 1a'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'message 1a'})).toBeResolved();

    // publish 'message 1b'
    await Beans.get(MessageClient).publish$('topic', 'message 1b', {retain: true}).toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'message 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'message 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'message 1b'})).toBeResolved();

    // unsubscribe observable 1
    subscription1.unsubscribe();

    // publish 'message 2a'
    await Beans.get(MessageClient).publish$('topic', 'message 2a', {retain: true}).toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'message 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'message 2a'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'message 2a'})).toBeResolved();

    // publish 'message 2b'
    await Beans.get(MessageClient).publish$('topic', 'message 2b', {retain: true}).toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'message 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'message 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'message 2b'})).toBeResolved();

    // unsubscribe observable 2
    subscription2.unsubscribe();

    // publish 'message 3a'
    await Beans.get(MessageClient).publish$('topic', 'message 3a', {retain: true}).toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'message 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'message 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'message 3a'})).toBeResolved();

    // publish 'message 3b'
    await Beans.get(MessageClient).publish$('topic', 'message 3b', {retain: true}).toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'message 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'message 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'message 3b'})).toBeResolved();

    // unsubscribe observable 3
    subscription3.unsubscribe();

    // publish 'message 4a'
    await Beans.get(MessageClient).publish$('topic', 'message 4a', {retain: true}).toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'message 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'message 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'message 3b'})).toBeResolved();

    // publish 'message 4b'
    await Beans.get(MessageClient).publish$('topic', 'message 4b', {retain: true}).toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'message 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'message 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'message 3b'})).toBeResolved();
  });

  it('should allow multiple subscriptions to the same intent in the same client', async () => {
    const manifestUrl = serveManifest({name: 'Host Application', capabilities: [{type: 'xyz'}]});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app', messaging: {brokerDiscoverTimeout: 250}});

    const receiver1$ = Beans.get(MessageClient).handleIntent$<string>().pipe(publishReplay(1)) as ConnectableObservable<IntentMessage<string>>;
    const receiver2$ = Beans.get(MessageClient).handleIntent$<string>().pipe(publishReplay(1)) as ConnectableObservable<IntentMessage<string>>;
    const receiver3$ = Beans.get(MessageClient).handleIntent$<string>().pipe(publishReplay(1)) as ConnectableObservable<IntentMessage<string>>;

    const subscription1 = receiver1$.connect();
    const subscription2 = receiver2$.connect();
    const subscription3 = receiver3$.connect();

    // issue 'intent 1a'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 1a').toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'intent 1a'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'intent 1a'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'intent 1a'})).toBeResolved();

    // issue 'intent 1b'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 1b').toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'intent 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'intent 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'intent 1b'})).toBeResolved();

    // unsubscribe observable 1
    subscription1.unsubscribe();

    // issue 'intent 2a'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 2a').toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'intent 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'intent 2a'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'intent 2a'})).toBeResolved();

    // issue 'intent 2b'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 2b').toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'intent 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'intent 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'intent 2b'})).toBeResolved();

    // unsubscribe observable 2
    subscription2.unsubscribe();

    // issue 'intent 3a'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 3a').toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'intent 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'intent 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'intent 3a'})).toBeResolved();

    // issue 'intent 3b'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 3b').toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'intent 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'intent 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'intent 3b'})).toBeResolved();

    // unsubscribe observable 3
    subscription3.unsubscribe();

    // issue 'intent 4a'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 4a').toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'intent 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'intent 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'intent 3b'})).toBeResolved();

    // issue 'intent 4b'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 4b').toPromise();
    await expectAsync(waitUntilMessageReceived(receiver1$, {body: 'intent 1b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver2$, {body: 'intent 2b'})).toBeResolved();
    await expectAsync(waitUntilMessageReceived(receiver3$, {body: 'intent 3b'})).toBeResolved();
  });

  it('should receive a message once regardless of the number of subscribers in the same client', async () => {
    const manifestUrl = serveManifest({name: 'Host Application'});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app', messaging: {brokerDiscoverTimeout: 250}});

    // Register two receivers
    Beans.get(MessageClient).observe$<string>('topic').subscribe();
    Beans.get(MessageClient).observe$<string>('topic').subscribe();

    // Register the test receiver
    const receiver = collectToPromise(Beans.get(MessageClient).observe$<string>('topic'), {take: 2, projectFn: bodyExtractFn});

    // publish 'message 1'
    await Beans.get(MessageClient).publish$('topic', 'message 1').toPromise();
    // publish 'message 2'
    await Beans.get(MessageClient).publish$('topic', 'message 2').toPromise();

    // expect only the two message to be dispatched
    await expectAsync(receiver).toBeResolvedTo(['message 1', 'message 2']);
  });

  it('should receive an intent once regardless of the number of subscribers in the same client', async () => {
    const manifestUrl = serveManifest({name: 'Host Application', capabilities: [{type: 'xyz'}]});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app', messaging: {brokerDiscoverTimeout: 250}});

    // Register two intent handlers
    Beans.get(MessageClient).handleIntent$<string>().subscribe();
    Beans.get(MessageClient).handleIntent$<string>().subscribe();

    // Register the test intent handler
    const receiver = collectToPromise(Beans.get(MessageClient).handleIntent$<string>(), {take: 2, projectFn: bodyExtractFn});

    // issue 'intent 1'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 1').toPromise();
    // issue 'intent 2'
    await Beans.get(MessageClient).issueIntent$({type: 'xyz'}, 'intent 2').toPromise();

    // expect only the two intents to be dispatched
    await expectAsync(receiver).toBeResolvedTo(['intent 1', 'intent 2']);
  });

  it('should allow tracking the subscriptions on a topic', async () => {
    await MicrofrontendPlatform.forHost([]);

    // Subscribe and wait until the initial subscription count, which is 0, is reported.
    const collectedCounts = collectToPromise(Beans.get(PlatformMessageClient).subscriberCount$('some-topic'), {take: 7});
    await waitUntilSubscriberCount('some-topic', 0, {timeout: 250});

    Beans.get(PlatformMessageClient).observe$<string>('some-topic').subscribe().unsubscribe();
    const subscription2 = Beans.get(PlatformMessageClient).observe$<string>('some-topic').subscribe();
    const subscription3 = Beans.get(PlatformMessageClient).observe$<string>('some-topic').subscribe();
    subscription2.unsubscribe();
    subscription3.unsubscribe();

    await expectAsync(collectedCounts).toBeResolvedTo([0, 1, 0, 1, 2, 1, 0]);
  });

  it('should set message headers about the sender (platform)', async () => {
    await MicrofrontendPlatform.forHost([]);

    Beans.get(PlatformMessageClient).publish$('some-topic', 'body', {retain: true}).subscribe();

    const actual$ = Beans.get(PlatformMessageClient).observe$<string>('some-topic');
    const message = await collectToPromise(actual$, {take: 1}).then(takeFirstElement);

    expect(message.headers.get(MessageHeaders.ClientId)).toBeDefined();
    expect(message.headers.get(MessageHeaders.AppSymbolicName)).toEqual(PLATFORM_SYMBOLIC_NAME);
  });

  it('should set message headers about the sender (host-app)', async () => {
    const manifestUrl = serveManifest({name: 'Host Application'});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app'});

    Beans.get(MessageClient).publish$('some-topic', 'body', {retain: true}).subscribe();

    const actual$ = Beans.get(PlatformMessageClient).observe$<string>('some-topic');
    const message = await collectToPromise(actual$, {take: 1}).then(takeFirstElement);

    expect(message.headers.get(MessageHeaders.ClientId)).toBeDefined();
    expect(message.headers.get(MessageHeaders.AppSymbolicName)).toEqual('host-app');
  });

  it('should deliver custom headers in retained message', async () => {
    const manifestUrl = serveManifest({name: 'Host Application'});
    const registeredApps: ApplicationConfig[] = [{symbolicName: 'host-app', manifestUrl: manifestUrl}];
    await MicrofrontendPlatform.forHost(registeredApps, {symbolicName: 'host-app'});

    Beans.get(MessageClient).publish$('some-topic', 'body', {retain: true, headers: new Map().set('custom-header', 'some-value')}).subscribe();

    await sleep(500); // ensure the message to be delivered as retained message

    const actual$ = Beans.get(PlatformMessageClient).observe$<string>('some-topic');
    const message = await collectToPromise(actual$, {take: 1}).then(takeFirstElement);

    expect(message.headers.get(MessageHeaders.ClientId)).toBeDefined();
    expect(message.headers.get(MessageHeaders.AppSymbolicName)).toEqual('host-app');
    expect(message.headers.get('custom-header')).toEqual('some-value');
  });
});

/**
 * Subscribes to the given {@link Observable} and resolves to the emitted messages.
 */
function collectToPromise<T, R = T>(observable$: Observable<T>, options: { take: number, timeout?: number, projectFn?: (msg: T) => R }): Promise<R[]> {
  const timeout = Defined.orElse(options.timeout, 1000);
  return observable$
    .pipe(
      take(options.take),
      timeoutWith(new Date(Date.now() + timeout), throwError('[SpecTimeoutError] Timeout elapsed.')),
      reduce((acc, value) => acc.concat(options.projectFn ? options.projectFn(value) : value), []),
    )
    .toPromise();
}

/**
 * Waits until the give Jasmin spy is invoked, or throws an error if not invoked within the specified timeout.
 */
function waitUntilInvoked(spy: Spy, options?: { timeout?: number }): Promise<never> {
  const timeout = Defined.orElse(options && options.timeout, 1000);
  return new Promise((resolve, reject) => { // tslint:disable-line:typedef
    const timeoutHandle = setTimeout(() => reject('[SpecTimeoutError] Timeout elapsed.'), timeout);
    spy.and.callFake(() => {
      clearTimeout(timeoutHandle);
      resolve();
    });
  });
}

/**
 * Waits until the given number of subscribers are subscribed to the given topic, or throws an error otherwise.
 */
async function waitUntilSubscriberCount(topic: string, expectedCount: number, options?: { timeout?: number }): Promise<void> {
  const timeout = Defined.orElse(options && options.timeout, 1000);
  await Beans.opt(PlatformMessageClient).subscriberCount$(topic)
    .pipe(
      first(count => count === expectedCount),
      timeoutWith(new Date(Date.now() + timeout), throwError('[SpecTimeoutError] Timeout elapsed.')),
    )
    .toPromise();
}

/**
 * Waits until a message with the given body is received.
 */
async function waitUntilMessageReceived(observable$: Observable<TopicMessage<any> | IntentMessage<any>>, waitUntil: { body: any, timeout?: number }): Promise<void> {
  const timeout = Defined.orElse(waitUntil.timeout, 250);
  await observable$
    .pipe(
      first(msg => Objects.isEqual(msg.body, waitUntil.body)),
      timeoutWith(new Date(Date.now() + timeout), throwError('[SpecTimeoutError] Timeout elapsed.')),
    )
    .toPromise();
}

function takeFirstElement<T>(array: T[]): T {
  return array[0];
}

function sleep(millis: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, millis)); // tslint:disable-line:typedef
}
