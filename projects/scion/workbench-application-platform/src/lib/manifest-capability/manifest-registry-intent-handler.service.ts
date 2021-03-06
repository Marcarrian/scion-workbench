/*
 * Copyright (c) 2018-2019 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */

import { Injectable } from '@angular/core';
import { IntentHandler } from '../core/metadata';
import { Application, Capability, Intent, IntentMessage, Manifest, ManifestCommands, ManifestRegistryIntentMessages, MessageEnvelope, NilQualifier, PlatformCapabilityTypes, Qualifier } from '@scion/workbench-application-platform.api';
import { MessageBus } from '../core/message-bus.service';
import { ApplicationRegistry } from '../core/application-registry.service';
import { ManifestRegistry } from '../core/manifest-registry.service';
import { Logger } from '../core/logger.service';
import { matchesCapabilityQualifier } from '../core/qualifier-tester';
import { Arrays } from '../core/array.util';
import { patchQualifier } from '../core/qualifier-patcher';

/**
 * Allows to query manifest registry.
 */
@Injectable()
export class ManifestRegistryIntentHandler implements IntentHandler {

  public readonly type: PlatformCapabilityTypes = PlatformCapabilityTypes.ManifestRegistry;
  public readonly qualifier = NilQualifier;
  public readonly description = 'Allows to query the manifest registry.';

  constructor(private _messageBus: MessageBus,
              private _applicationRegistry: ApplicationRegistry,
              private _manifestRegistry: ManifestRegistry,
              private _logger: Logger) {
  }

  public onIntent(envelope: MessageEnvelope<IntentMessage>): void {
    // provide fallback for the former 'query' property of manifest commands
    const command = envelope.message.payload.command || envelope.message.payload.query;
    switch (command) {
      case ManifestCommands.FindManifests: {
        this.queryManifests(envelope as MessageEnvelope<ManifestRegistryIntentMessages.FindManifests>);
        break;
      }
      case ManifestCommands.FindManifest: {
        this.queryManifest(envelope as MessageEnvelope<ManifestRegistryIntentMessages.FindManifest>);
        break;
      }
      case ManifestCommands.FindCapabilityProviders: {
        this.queryCapabilityProviders(envelope as MessageEnvelope<ManifestRegistryIntentMessages.FindCapabilityProviders>);
        break;
      }
      case ManifestCommands.FindCapabilityConsumers: {
        this.queryCapabilityConsumers(envelope as MessageEnvelope<ManifestRegistryIntentMessages.FindCapabilityConsumers>);
        break;
      }
      case ManifestCommands.FindCapability: {
        this.queryCapability(envelope as MessageEnvelope<ManifestRegistryIntentMessages.FindCapability>);
        break;
      }
      case ManifestCommands.FindCapabilities: {
        this.queryCapabilities(envelope as MessageEnvelope<ManifestRegistryIntentMessages.FindCapabilities>);
        break;
      }
      case ManifestCommands.RegisterCapability: {
        this.registerCapability(envelope as MessageEnvelope<ManifestRegistryIntentMessages.RegisterCapability>);
        break;
      }
      case ManifestCommands.UnregisterCapability: {
        this.unregisterCapability(envelope as MessageEnvelope<ManifestRegistryIntentMessages.UnregisterCapability>);
        break;
      }
      default: {
        this._logger.error(`[UnsupportedQueryError] Command not supported [command=${command}]`);
        this._messageBus.publishReply(null, envelope.sender, envelope.replyToUid);
      }
    }
  }

  private queryManifests(envelope: MessageEnvelope<ManifestRegistryIntentMessages.FindManifests>): void {
    const manifests = this._applicationRegistry.getApplications()
      .map(application => this.loadManifest(application.symbolicName))
      .filter(Boolean);
    this._messageBus.publishReply(manifests, envelope.sender, envelope.replyToUid);
  }

  private queryManifest(envelope: MessageEnvelope<ManifestRegistryIntentMessages.FindManifest>): void {
    const symbolicAppName = envelope.message.payload.symbolicAppName;
    const manifest = this.loadManifest(symbolicAppName);
    this._messageBus.publishReply(manifest, envelope.sender, envelope.replyToUid);
  }

  /**
   * Finds applications which provide a capability for the given intent.
   */
  private queryCapabilityProviders(envelope: MessageEnvelope<ManifestRegistryIntentMessages.FindCapabilityProviders>): void {
    const intentId = envelope.message.payload.intentId;
    const intent: Intent = this._manifestRegistry.getIntent(intentId);

    const providers: Application[] = this._manifestRegistry.getCapabilitiesByType(intent.type)
      .filter(capability => this._manifestRegistry.isVisibleForApplication(capability, intent.metadata.symbolicAppName))
      .filter(capability => {
        const patchedQualifier: Qualifier = patchQualifier(intent.qualifier, capability.qualifier);
        return matchesCapabilityQualifier(capability.qualifier, patchedQualifier);
      })
      .map(capability => this._applicationRegistry.getApplication(capability.metadata.symbolicAppName));

    const distinctProviders: Application[] = Arrays.distinct(providers, (app) => app.symbolicName);
    this._messageBus.publishReply(distinctProviders, envelope.sender, envelope.replyToUid);
  }

  /**
   * Finds applications which consume given capability.
   */
  private queryCapabilityConsumers(envelope: MessageEnvelope<ManifestRegistryIntentMessages.FindCapabilityConsumers>): void {
    const capabilityId = envelope.message.payload.capabilityId;
    const capability: Capability = this._manifestRegistry.getCapability(capabilityId);
    const consumers: Application[] = [];

    this._applicationRegistry.getApplications().forEach(application => {
      const intents = this._manifestRegistry.getIntentsByApplication(application.symbolicName);
      const isConsumer = intents
        .filter(intent => !capability.private || this._manifestRegistry.isScopeCheckDisabled(intent.metadata.symbolicAppName) || intent.metadata.symbolicAppName === capability.metadata.symbolicAppName)
        .filter(intent => intent.type === capability.type)
        .some(intent => {
          const patchedQualifier: Qualifier = patchQualifier(intent.qualifier, capability.qualifier);
          return matchesCapabilityQualifier(capability.qualifier, patchedQualifier);
        });
      if (isConsumer) {
        consumers.push(application);
      }
    });

    this._messageBus.publishReply(consumers, envelope.sender, envelope.replyToUid);
  }

  /**
   * Finds capabilities of given type and qualifier.
   *
   * There are only capabilities returned for which the requesting application has manifested an intent.
   */
  private queryCapabilities(envelope: MessageEnvelope<ManifestRegistryIntentMessages.FindCapabilities>): void {
    const type: string = envelope.message.payload.type;
    const qualifier: Qualifier = envelope.message.payload.qualifier;

    const capabilities: Capability[] = this._manifestRegistry.getCapabilitiesByType(type)
      .filter(capability => this._manifestRegistry.isVisibleForApplication(capability, envelope.sender))
      .filter(capability => {
        const patchedQualifier: Qualifier = patchQualifier(qualifier, capability.qualifier);
        return matchesCapabilityQualifier(capability.qualifier, patchedQualifier);
      })
      .filter(capability => this._manifestRegistry.isScopeCheckDisabled(envelope.sender) || this._manifestRegistry.hasIntent(envelope.sender, capability.type, capability.qualifier));
    this._messageBus.publishReply(capabilities, envelope.sender, envelope.replyToUid);
  }

  private queryCapability(envelope: MessageEnvelope<ManifestRegistryIntentMessages.FindCapability>): void {
    const capabilityId = envelope.message.payload.capabilityId;
    const capability: Capability = this._manifestRegistry.getCapability(capabilityId);
    this._messageBus.publishReply(capability, envelope.sender, envelope.replyToUid);
  }

  /**
   * Registers given capability.
   */
  private registerCapability(envelope: MessageEnvelope<ManifestRegistryIntentMessages.RegisterCapability>): void {
    const capability: Capability = envelope.message.payload.capability;
    try {
      this._manifestRegistry.registerCapability(envelope.sender, [capability]);
      this._messageBus.publishReply({status: 'ok'}, envelope.sender, envelope.replyToUid);
    }
    catch (error) {
      this._messageBus.publishReply({status: 'error', message: error.message}, envelope.sender, envelope.replyToUid);
    }
  }

  /**
   * Unregisters capability of given type and qualifier.
   *
   * The requesting application can only unregister its own capabilities.
   */
  private unregisterCapability(envelope: MessageEnvelope<ManifestRegistryIntentMessages.UnregisterCapability>): void {
    const type: string = envelope.message.payload.type;
    const qualifier: Qualifier = envelope.message.payload.qualifier;
    try {
      this._manifestRegistry.unregisterCapability(envelope.sender, type, qualifier);
      this._messageBus.publishReply({status: 'ok'}, envelope.sender, envelope.replyToUid);
    }
    catch (error) {
      this._messageBus.publishReply({status: 'error', message: error.message}, envelope.sender, envelope.replyToUid);
    }
  }

  private loadManifest(symbolicName: string): Manifest {
    const application = this._applicationRegistry.getApplication(symbolicName);
    if (!application) {
      this._logger.error(`[ApplicationNotFoundError] No application registered with given symbolic name '${symbolicName}'`);
      return null;
    }

    return {
      symbolicName: application.symbolicName,
      name: application.name,
      baseUrl: application.baseUrl,
      manifestUrl: application.manifestUrl,
      scopeCheckDisabled: application.scopeCheckDisabled,
      restrictions: application.restrictions,
      intents: this._manifestRegistry.getIntentsByApplication(application.symbolicName),
      capabilities: this._manifestRegistry.getCapabilitiesByApplication(application.symbolicName),
    };
  }
}

