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
import { ActivityActionProvider } from '../metadata';
import { PopupOpenActivityActionComponent } from './popup-open-activity-action.component';
import { PlatformActivityActionTypes } from '@scion/workbench-application-platform.api';

/**
 * Provides a button to open a popup.
 */
@Injectable()
export class PopupOpenActivityActionProvider implements ActivityActionProvider {
  public type = PlatformActivityActionTypes.PopupOpen;
  public component = PopupOpenActivityActionComponent;
}

