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
import { Platform, Qualifier, RouterService, ViewNavigateCommand, ViewRef } from '@scion/workbench-application.core';

/**
 * Provides workbench view navigation capabilities.
 */
@Injectable({providedIn: 'root'})
export class WorkbenchRouter {

  /**
   * Navigates based on the provided view qualifier.
   *
   * To open views of other applications, ensure to have listed respective intents in the application manifest.
   * To close present views matching the qualifier, set `closeIfPresent` in navigational extras.
   *
   * @see WorkbenchRouterLinkDirective
   */
  public navigate(qualifier: Qualifier, extras: WbNavigationExtras = {}): void {
    const navigateCommand: ViewNavigateCommand = {
      qualifier: qualifier,
      queryParams: extras.queryParams,
      matrixParams: extras.matrixParams,
      activateIfPresent: extras.activateIfPresent,
      closeIfPresent: extras.closeIfPresent,
      target: extras.target,
      blankInsertionIndex: extras.blankInsertionIndex,
    };
    Platform.getService(RouterService).navigate(navigateCommand);
  }
}

/**
 * Represents the extra options used during navigation.
 */
export interface WbNavigationExtras {
  /**
   * Activates the view if it is already present.
   * If not present, the view is opened according to the specified 'target' strategy.
   */
  activateIfPresent?: boolean;
  /**
   * Closes the view(s) that match the qualifier, if any.
   */
  closeIfPresent?: boolean;
  /**
   * Controls where to open the view.
   *
   * 'blank':   opens the view in a new view tab (which is by default)
   * 'self':    opens the view in the current view tab
   * <viewRef>: opens the view in the given view tab
   */
  target?: 'blank' | 'self' | ViewRef;
  /**
   * Specifies optional query parameters to open the view.
   */
  queryParams?: {
    [key: string]: string;
  };
  /**
   * Specifies optional matrix parameters to open the view.
   *
   * Matrix parameters can be used to associate optional data with the URL and are like regular URL parameters,
   * but do not affect route resolution.
   */
  matrixParams?: {
    [key: string]: any;
  };
  /**
   * Specifies the position where to insert the view into the tab bar when using 'blank' view target strategy.
   * If not specified, the view is inserted after the active view. Set the index to 'start' or 'end' for inserting
   * the view at the beginning or at the end.
   */
  blankInsertionIndex?: number | 'start' | 'end' | undefined;
}
