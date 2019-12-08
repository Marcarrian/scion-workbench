/*
 * Copyright (c) 2018-2019 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms from the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */

import { Outlets, TestingAppOrigins, TestingAppPO } from '../testing-app.po';
import { MessagingModel, PublishMessagePagePO } from './publish-message-page.po';
import { ReceiveMessagePagePO } from './receive-message-page.po';
import { OutletPO } from '../outlet.po';
import { expectToBeRejectedWithError } from '../spec.util';

/**
 * Contains Specs for topic-based messaging.
 */
export namespace TopicBasedMessagingSpecs {

  export namespace RootOutlets {

    /**
     * Tests that messages can be published and received.
     */
    export async function publishSpec(publisherOrigin: string, receiverOrigin: string): Promise<void> {
      await testPublishInternal({
        publisher: {useClass: PublishMessagePagePO, origin: publisherOrigin},
        receiver: {useClass: ReceiveMessagePagePO, origin: receiverOrigin},
      });
    }

    /**
     * Tests that an application can reply to a message.
     */
    export async function replySpec(publisherOrigin: string, receiverOrigin: string): Promise<void> {
      await testReplyInternal({
        publisher: {useClass: PublishMessagePagePO, origin: publisherOrigin},
        receiver: {useClass: ReceiveMessagePagePO, origin: receiverOrigin},
      });
    }
  }

  export namespace ChildOutlets {

    /**
     * Tests that messages can be published and received.
     */
    export async function publishSpec(publisherOrigin: string, receiverOrigin: string): Promise<void> {
      await testPublishInternal({
        outlet1: {
          outlet2: {
            publisher: {useClass: PublishMessagePagePO, origin: publisherOrigin},
          },
        },
        outlet3: {
          outlet4: {
            outlet5: {
              receiver: {useClass: ReceiveMessagePagePO, origin: receiverOrigin},
            },
          },
        },
      });
    }

    /**
     * Tests that an application can reply to a message.
     */
    export async function replySpec(publisherOrigin: string, receiverOrigin: string): Promise<void> {
      await testReplyInternal({
        outlet1: {
          outlet2: {
            publisher: {useClass: PublishMessagePagePO, origin: publisherOrigin},
          },
        },
        outlet3: {
          outlet4: {
            outlet5: {
              receiver: {useClass: ReceiveMessagePagePO, origin: receiverOrigin},
            },
          },
        },
      });
    }
  }

  /**
   * Tests that messages can be published and received.
   */
  async function testPublishInternal(testSetup: Outlets): Promise<void> {
    const testingAppPO = new TestingAppPO();
    const pagePOs = await testingAppPO.navigateTo(testSetup);

    const receiverPO = pagePOs.get<ReceiveMessagePagePO>('receiver');
    await receiverPO.selectMessagingModel(MessagingModel.Topic);
    await receiverPO.enterTopic('some-topic');
    await receiverPO.clickSubscribe();

    const publisherPO = pagePOs.get<PublishMessagePagePO>('publisher');
    await publisherPO.selectMessagingModel(MessagingModel.Topic);
    await publisherPO.enterTopic('some-topic');
    await publisherPO.enterMessage('first message');

    // publish the first message
    await publisherPO.clickPublish();

    const message1PO = await receiverPO.getFirstMessageOrElseReject();
    await expect(message1PO.getTopic()).toEqual('some-topic');
    await expect(message1PO.getPayload()).toEqual('first message');
    await expect(message1PO.getReplyTo()).toBeUndefined();

    // clear the messages list
    await receiverPO.clickClearMessages();
    await expect(receiverPO.getMessages()).toEqual([]);

    // publish a second message
    await publisherPO.enterMessage('second message');
    await publisherPO.clickPublish();

    const message2PO = await receiverPO.getFirstMessageOrElseReject();
    await expect(message2PO.getTopic()).toEqual('some-topic');
    await expect(message2PO.getPayload()).toEqual('second message');
    await expect(message2PO.getReplyTo()).toBeUndefined();

    // clear the messages list
    await receiverPO.clickClearMessages();
    await expect(receiverPO.getMessages()).toEqual([]);

    // publish a third message
    await publisherPO.enterMessage('third message');
    await publisherPO.clickPublish();

    const message3PO = await receiverPO.getFirstMessageOrElseReject();
    await expect(message3PO.getTopic()).toEqual('some-topic');
    await expect(message3PO.getPayload()).toEqual('third message');
    await expect(message3PO.getReplyTo()).toBeUndefined();
  }

  /**
   * Tests that an application can reply to a message.
   */
  async function testReplyInternal(testSetup: Outlets): Promise<void> {
    const testingAppPO = new TestingAppPO();
    const pagePOs = await testingAppPO.navigateTo(testSetup);

    const receiverPO = pagePOs.get<ReceiveMessagePagePO>('receiver');
    await receiverPO.selectMessagingModel(MessagingModel.Topic);
    await receiverPO.enterTopic('some-topic');
    await receiverPO.clickSubscribe();

    const publisherPO = pagePOs.get<PublishMessagePagePO>('publisher');
    await publisherPO.selectMessagingModel(MessagingModel.Topic);
    await publisherPO.enterTopic('some-topic');
    await publisherPO.enterMessage('some-payload');
    await publisherPO.toggleRequestReply(true);
    await publisherPO.clickPublish();

    const messagePO = await receiverPO.getFirstMessageOrElseReject();
    const replyTo = await messagePO.getReplyTo();
    await expect(replyTo).not.toBeUndefined();

    // send a reply
    await messagePO.clickReply();

    const reply1PO = await publisherPO.getFirstReplyOrElseReject();
    await expect(reply1PO.getTopic()).toEqual(replyTo);
    await expect(reply1PO.getPayload()).toEqual('this is a reply');
    await expect(reply1PO.getReplyTo()).toBeUndefined();

    // clear the replies list
    await publisherPO.clickClearReplies();
    await expect(publisherPO.getReplies()).toEqual([]);

    // send a second reply
    await messagePO.clickReply();
    const reply2PO = await publisherPO.getFirstReplyOrElseReject();
    await expect(reply2PO.getTopic()).toEqual(replyTo);
    await expect(reply2PO.getPayload()).toEqual('this is a reply');
    await expect(reply2PO.getReplyTo()).toBeUndefined();

    // clear the replies list
    await publisherPO.clickClearReplies();
    await expect(publisherPO.getReplies()).toEqual([]);

    // send a third reply
    await messagePO.clickReply();
    const reply3PO = await publisherPO.getFirstReplyOrElseReject();
    await expect(reply3PO.getTopic()).toEqual(replyTo);
    await expect(reply3PO.getPayload()).toEqual('this is a reply');
    await expect(reply3PO.getReplyTo()).toBeUndefined();
  }

  /**
   * Tests that a message is dispatched to multiple subscribers.
   */
  export async function subscribersReceiveSpec(): Promise<void> {
    const testingAppPO = new TestingAppPO();
    const pagePOs = await testingAppPO.navigateTo({
      publisher: {useClass: PublishMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver1: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver2: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4202},
      receiver3: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4202},
    });

    const publisherPO = pagePOs.get<PublishMessagePagePO>('publisher');
    await publisherPO.selectMessagingModel(MessagingModel.Topic);
    await publisherPO.enterTopic('some-topic');

    const receiver1PO = pagePOs.get<ReceiveMessagePagePO>('receiver1');
    await receiver1PO.selectMessagingModel(MessagingModel.Topic);
    await receiver1PO.enterTopic('some-topic');
    await receiver1PO.clickSubscribe();

    const receiver2PO = pagePOs.get<ReceiveMessagePagePO>('receiver2');
    await receiver2PO.selectMessagingModel(MessagingModel.Topic);
    await receiver2PO.enterTopic('some-topic');
    await receiver2PO.clickSubscribe();

    const receiver3PO = pagePOs.get<ReceiveMessagePagePO>('receiver3');
    await receiver3PO.selectMessagingModel(MessagingModel.Topic);
    await receiver3PO.enterTopic('some-topic');
    await receiver3PO.clickSubscribe();

    // publish the first message
    await publisherPO.enterMessage('first message');
    await publisherPO.clickPublish();

    await expect((await receiver1PO.getFirstMessageOrElseReject()).getPayload()).toEqual('first message');
    await expect((await receiver2PO.getFirstMessageOrElseReject()).getPayload()).toEqual('first message');
    await expect((await receiver3PO.getFirstMessageOrElseReject()).getPayload()).toEqual('first message');

    // clear the messages
    await receiver1PO.clickClearMessages();
    await receiver2PO.clickClearMessages();
    await receiver3PO.clickClearMessages();

    // publish the second message
    await publisherPO.enterMessage('second message');
    await publisherPO.clickPublish();

    await expect((await receiver1PO.getFirstMessageOrElseReject()).getPayload()).toEqual('second message');
    await expect((await receiver2PO.getFirstMessageOrElseReject()).getPayload()).toEqual('second message');
    await expect((await receiver3PO.getFirstMessageOrElseReject()).getPayload()).toEqual('second message');
  }

  /**
   * Tests that publishing a request to a topic throws an error when no replier is subscribed to the topic.
   */
  export async function throwIfNoReplierFoundSpec(): Promise<void> {
    const testingAppPO = new TestingAppPO();
    const pagePOs = await testingAppPO.navigateTo({
      publisher: {useClass: PublishMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
    });

    const publisherPO = pagePOs.get<PublishMessagePagePO>('publisher');
    await publisherPO.selectMessagingModel(MessagingModel.Topic);
    await publisherPO.enterTopic('some-topic');
    await publisherPO.toggleRequestReply(true);
    await publisherPO.clickPublish();

    await expect(publisherPO.getPublishError()).toContain('[RequestReplyError]');
  }

  /**
   * Tests receiving replies of multiple message subscribers.
   */
  export async function subscribersReplySpec(): Promise<void> {
    const testingAppPO = new TestingAppPO();
    const pagePOs = await testingAppPO.navigateTo({
      publisher: {useClass: PublishMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver1: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver2: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4202},
      receiver3: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4202},
    });

    const publisherPO = pagePOs.get<PublishMessagePagePO>('publisher');
    await publisherPO.selectMessagingModel(MessagingModel.Topic);
    await publisherPO.enterTopic('some-topic');
    await publisherPO.toggleRequestReply(true);

    const receiver1PO = pagePOs.get<ReceiveMessagePagePO>('receiver1');
    await receiver1PO.selectMessagingModel(MessagingModel.Topic);
    await receiver1PO.enterTopic('some-topic');
    await receiver1PO.clickSubscribe();

    const receiver2PO = pagePOs.get<ReceiveMessagePagePO>('receiver2');
    await receiver2PO.selectMessagingModel(MessagingModel.Topic);
    await receiver2PO.enterTopic('some-topic');
    await receiver2PO.clickSubscribe();

    const receiver3PO = pagePOs.get<ReceiveMessagePagePO>('receiver3');
    await receiver3PO.selectMessagingModel(MessagingModel.Topic);
    await receiver3PO.enterTopic('some-topic');
    await receiver3PO.clickSubscribe();

    // publish the message
    await publisherPO.enterMessage('message');
    await publisherPO.clickPublish();

    // send a replies from every subscriber
    await (await receiver1PO.getFirstMessageOrElseReject()).clickReply();
    await expect((await publisherPO.getFirstReplyOrElseReject()).getPayload()).toEqual('this is a reply');
    await publisherPO.clickClearReplies();

    await (await receiver2PO.getFirstMessageOrElseReject()).clickReply();
    await expect((await publisherPO.getFirstReplyOrElseReject()).getPayload()).toEqual('this is a reply');
    await publisherPO.clickClearReplies();

    await (await receiver3PO.getFirstMessageOrElseReject()).clickReply();
    await expect((await publisherPO.getFirstReplyOrElseReject()).getPayload()).toEqual('this is a reply');
    await publisherPO.clickClearReplies();
  }

  /**
   * Tests topic subscription count to work as expected.
   */
  export async function subscriberCountSpec(): Promise<void> {
    const testingAppPO = new TestingAppPO();

    const pagePOs = await testingAppPO.navigateTo({
      publisher_4202: {useClass: PublishMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver1: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4200},
      receiver2: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver3: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver4: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4202},
    });

    const publisherPO = pagePOs.get<PublishMessagePagePO>('publisher_4202');
    await publisherPO.selectMessagingModel(MessagingModel.Topic);

    // 'receiver1' subscribes to 'topic-1'
    const receiver1PO = pagePOs.get<ReceiveMessagePagePO>('receiver1');
    await receiver1PO.selectMessagingModel(MessagingModel.Topic);
    await receiver1PO.enterTopic('topic-1');
    await receiver1PO.clickSubscribe();

    // 'receiver2' subscribes to 'topic-2'
    const receiver2PO = pagePOs.get<ReceiveMessagePagePO>('receiver2');
    await receiver2PO.selectMessagingModel(MessagingModel.Topic);
    await receiver2PO.enterTopic('topic-2');
    await receiver2PO.clickSubscribe();

    // 'receiver3' subscribes to 'topic-3'
    const receiver3PO = pagePOs.get<ReceiveMessagePagePO>('receiver3');
    await receiver3PO.selectMessagingModel(MessagingModel.Topic);
    await receiver3PO.enterTopic('topic-3');
    await receiver3PO.clickSubscribe();

    // 'receiver4' subscribes to 'topic-2'
    const receiver4PO = pagePOs.get<ReceiveMessagePagePO>('receiver4');
    await receiver4PO.selectMessagingModel(MessagingModel.Topic);
    await receiver4PO.enterTopic('topic-2');
    await receiver4PO.clickSubscribe();

    // assert subscriber count on 'topic-1'
    await publisherPO.enterTopic('topic-1');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(1);

    // assert subscriber count on 'topic-2'
    await publisherPO.enterTopic('topic-2');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(2);

    // assert subscriber count on 'topic-3'
    await publisherPO.enterTopic('topic-3');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(1);

    // unsubscribe 'receiver1'
    await receiver1PO.clickUnsubscribe();

    // assert subscriber count on 'topic-1'
    await publisherPO.enterTopic('topic-1');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(0);

    // assert subscriber count on 'topic-2'
    await publisherPO.enterTopic('topic-2');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(2);

    // assert subscriber count on 'topic-3'
    await publisherPO.enterTopic('topic-3');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(1);

    // unsubscribe 'receiver2'
    await receiver2PO.clickUnsubscribe();

    // assert subscriber count on 'topic-1'
    await publisherPO.enterTopic('topic-1');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(0);

    // assert subscriber count on 'topic-2'
    await publisherPO.enterTopic('topic-2');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(1);

    // assert subscriber count on 'topic-3'
    await publisherPO.enterTopic('topic-3');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(1);

    // unload page of 'receiver3'
    const outlet = pagePOs.get<OutletPO>('receiver3:outlet');
    await outlet.enterUrl('about:blank');

    // assert subscriber count on 'topic-1'
    await publisherPO.enterTopic('topic-1');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(0);

    // assert subscriber count on 'topic-2'
    await publisherPO.enterTopic('topic-2');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(1);

    // assert subscriber count on 'topic-3'
    await publisherPO.enterTopic('topic-3');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(0);

    // unsubscribe 'receiver4'
    await receiver4PO.clickUnsubscribe();

    // assert subscriber count on 'topic-1'
    await publisherPO.enterTopic('topic-1');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(0);

    // assert subscriber count on 'topic-2'
    await publisherPO.enterTopic('topic-2');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(0);

    // assert subscriber count on 'topic-3'
    await publisherPO.enterTopic('topic-3');
    await expect(publisherPO.getTopicSubscriberCount()).toEqual(0);
  }

  /**
   * Tests receiving messages which are retained on the broker.
   */
  export async function receiveRetainedMessagesSpec(): Promise<void> {
    const testingAppPO = new TestingAppPO();
    const pagePOs = await testingAppPO.navigateTo({
      publisher_4201: {useClass: PublishMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver: 'about:blank',
    });

    // publish a retained message
    const publisherPO = await pagePOs.get<PublishMessagePagePO>('publisher_4201');
    await publisherPO.selectMessagingModel(MessagingModel.Topic);
    await publisherPO.enterTopic('some-topic');
    await publisherPO.toggleRetain(true);
    await publisherPO.enterMessage('retained message');
    await publisherPO.clickPublish();

    const receiverOutletPO = pagePOs.get<OutletPO>('receiver');

    // test to receive retained message in LOCALHOST_4200
    const receiver4200PO = await receiverOutletPO.enterUrl<ReceiveMessagePagePO>({useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4200});
    await receiver4200PO.selectMessagingModel(MessagingModel.Topic);
    await receiver4200PO.enterTopic('some-topic');
    await receiver4200PO.clickSubscribe();
    await expect((await receiver4200PO.getFirstMessageOrElseReject()).getPayload()).toEqual('retained message');

    // test to receive retained message in LOCALHOST_4201
    let receiver4201PO = await receiverOutletPO.enterUrl<ReceiveMessagePagePO>({useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201});
    await receiver4201PO.selectMessagingModel(MessagingModel.Topic);
    await receiver4201PO.enterTopic('some-topic');
    await receiver4201PO.clickSubscribe();
    await expect((await receiver4201PO.getFirstMessageOrElseReject()).getPayload()).toEqual('retained message');
    await receiver4201PO.clickClearMessages();

    // clear the retained message
    await publisherPO.enterMessage('');
    await publisherPO.clickPublish();

    // expect the empty message not to be dispatched
    await expectToBeRejectedWithError(receiver4201PO.getFirstMessageOrElseReject(1000), /[TimeoutError]/);

    // test not to receive the retained message in LOCALHOST_4201
    receiver4201PO = await receiverOutletPO.enterUrl<ReceiveMessagePagePO>({useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4203});
    await receiver4201PO.selectMessagingModel(MessagingModel.Topic);
    await receiver4201PO.enterTopic('some-topic');
    await receiver4201PO.clickSubscribe();

    await expectToBeRejectedWithError(receiver4201PO.getFirstMessageOrElseReject(1000), /[TimeoutError1]/);
  }

  /**
   * Tests receiving messages without a payload.
   */
  export async function receiveMessagesWithoutPayloadSpec(): Promise<void> {
    const testingAppPO = new TestingAppPO();
    const pagePOs = await testingAppPO.navigateTo({
      publisher_4201: {useClass: PublishMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4201},
      receiver_4202: {useClass: ReceiveMessagePagePO, origin: TestingAppOrigins.LOCALHOST_4202},
    });

    // test to receive retained message in LOCALHOST_4200
    const receiverPO = await pagePOs.get<ReceiveMessagePagePO>('receiver_4202');
    await receiverPO.selectMessagingModel(MessagingModel.Topic);
    await receiverPO.enterTopic('some-topic');
    await receiverPO.clickSubscribe();

    // publish a retained message
    const publisherPO = await pagePOs.get<PublishMessagePagePO>('publisher_4201');
    await publisherPO.selectMessagingModel(MessagingModel.Topic);
    await publisherPO.enterTopic('some-topic');
    await publisherPO.clickPublish();

    await expect((await receiverPO.getFirstMessageOrElseReject()).getTopic()).toEqual('some-topic');
  }
}