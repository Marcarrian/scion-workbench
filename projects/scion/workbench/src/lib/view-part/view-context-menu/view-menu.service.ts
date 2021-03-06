/*
 * Copyright (c) 2018-2019 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */

import { ElementRef, Injectable, Injector } from '@angular/core';
import { ConnectedPosition, Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, PortalInjector } from '@angular/cdk/portal';
import { ViewMenuComponent } from './view-menu.component';
import { InternalWorkbenchView, WorkbenchMenuItem, WorkbenchView } from '../../workbench.model';
import { WorkbenchViewRegistry } from '../../workbench-view-registry.service';
import { filter, mapTo, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { filterArray } from '../../operators';
import { fromEvent, merge, Observable, Subject, TeardownLogic } from 'rxjs';
import { Arrays } from '../../array.util';
import { coerceElement } from '@angular/cdk/coercion';
import { TEXT, TextComponent } from '../view-context-menu/text.component';
import { WorkbenchConfig } from '../../workbench.config';
import { WorkbenchService } from '../../workbench.service';

/**
 * Shows menu items of a {@link WorkbenchView} in a menu.
 */
@Injectable({providedIn: 'root'})
export class ViewMenuService {

  private static readonly TOP_LEFT: ConnectedPosition = {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top'};
  private static readonly TOP_RIGHT: ConnectedPosition = {originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top'};
  private static readonly BOTTOM_LEFT: ConnectedPosition = {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom'};
  private static readonly BOTTOM_RIGHT: ConnectedPosition = {originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom'};

  constructor(private _overlay: Overlay,
              private _injector: Injector,
              private _viewRegistry: WorkbenchViewRegistry,
              private _workbench: WorkbenchService,
              private _config: WorkbenchConfig) {
  }

  /**
   * Shows a menu with menu items registered in given {@link WorkbenchView}.
   *
   * @see {@link WorkbenchView.registerViewMenuItem}
   */
  public async showMenu(location: Point, viewRef: string): Promise<boolean> {
    const view = this._viewRegistry.getElseThrow(viewRef);
    const menuItems = await view.menuItems$.pipe(take(1)).toPromise();

    // Do not show the menu if there are no menu items registered.
    if (menuItems.length === 0) {
      return false;
    }

    // Prepare and display the menu overlay.
    const config = new OverlayConfig({
      scrollStrategy: this._overlay.scrollStrategies.noop(),
      hasBackdrop: true,
      backdropClass: null,
      disposeOnNavigation: true,
      positionStrategy: this._overlay.position()
        .flexibleConnectedTo(location)
        .withFlexibleDimensions(false)
        .withPositions([ViewMenuService.TOP_LEFT, ViewMenuService.TOP_RIGHT, ViewMenuService.BOTTOM_LEFT, ViewMenuService.BOTTOM_RIGHT]),
    });

    const overlayRef = this._overlay.create(config);
    const injector = new PortalInjector(this._injector, new WeakMap()
      .set(OverlayRef, overlayRef)
      .set(WorkbenchView, view)
      .set(InternalWorkbenchView, view),
    );
    overlayRef.attach(new ComponentPortal(ViewMenuComponent, null, injector));
    return true;
  }

  /**
   * Upon subscription, installs keyboard accelerators of the menu items registered in {@link WorkbenchView}.
   */
  public installMenuItemAccelerators$(target: ElementRef<HTMLElement> | HTMLElement, view: InternalWorkbenchView): Observable<void> {
    return new Observable((): TeardownLogic => {
      const unsubscribe$ = new Subject<void>();

      view.menuItems$
        .pipe(
          // skip menu items which have no accelerator configured
          filterArray((menuItem: WorkbenchMenuItem) => menuItem.accelerator && menuItem.accelerator.length > 0),
          // register the menu item keyboard accelerators
          switchMap((menuItems: WorkbenchMenuItem[]): Observable<WorkbenchMenuItem> => {
            const accelerators$ = menuItems.map(menuItem => {
              const key = Arrays.last(menuItem.accelerator);
              const modifierKeys = menuItem.accelerator.slice(0, -1);

              return fromEvent<KeyboardEvent>(coerceElement(target), 'keydown')
                .pipe(
                  filter(event => event.key.toLowerCase() === key.toLowerCase()), // ignore the shift modifier when comparing the pressed key
                  filter(event => Arrays.equal(modifierKeys, getModifierState(event), false)), // check the modifier state of the pressed key
                  tap(event => {
                    event.preventDefault();
                    event.stopPropagation();
                  }),
                  mapTo(menuItem),
                );
            });
            return merge(...accelerators$);
          }),
          filter((menuItem: WorkbenchMenuItem) => !menuItem.isDisabled || !menuItem.isDisabled()),
          takeUntil(unsubscribe$),
        )
        .subscribe((menuItem: WorkbenchMenuItem) => {
          menuItem.onAction();
        });

      return (): void => unsubscribe$.next();
    });
  }

  /**
   * Registers built-in menu items added to the context menu of every view tab.
   */
  public registerBuiltInMenuItems(): void {
    this.registerCloseViewMenuItem();
    this.registerCloseOtherViewsMenuItem();
    this.registerCloseAllViewsMenuItem();
    this.registerCloseViewsToTheRightMenuItem();
    this.registerCloseViewsToTheLeftMenuItem();
    this.registerMoveRightMenuItem();
    this.registerMoveLeftMenuItem();
    this.registerMoveUpMenuItem();
    this.registerMoveDownMenuItem();
    this.registerOpenInNewWindowMenuItem();
  }

  private registerCloseViewMenuItem(): void {
    const defaults = {visible: true, text: 'Close tab', group: 'close', accelerator: ['ctrl', 'k']};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.close;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      onAction: (): void => void view.close('self').then(),
    }));
  }

  private registerCloseOtherViewsMenuItem(): void {
    const defaults = {visible: true, text: 'Close other tabs', group: 'close', accelerator: ['ctrl', 'shift', 'k']};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.closeOthers;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      isDisabled: (): boolean => view.first && view.last,
      onAction: (): void => void view.close('other-views').then(),
    }));
  }

  private registerCloseAllViewsMenuItem(): void {
    const defaults = {visible: true, text: 'Close all tabs', group: 'close', accelerator: ['ctrl', 'shift', 'alt', 'k']};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.closeAll;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      onAction: (): void => void view.close('all-views').then(),
    }));
  }

  private registerCloseViewsToTheRightMenuItem(): void {
    const defaults = {visible: true, text: 'Close tabs to the right', group: 'close'};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.closeToTheRight;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      isDisabled: (): boolean => view.last,
      onAction: (): void => void view.close('views-to-the-right').then(),
    }));
  }

  private registerCloseViewsToTheLeftMenuItem(): void {
    const defaults = {visible: true, text: 'Close tabs to the left', group: 'close'};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.closeToTheLeft;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      isDisabled: (): boolean => view.first,
      onAction: (): void => void view.close('views-to-the-left').then(),
    }));
  }

  private registerMoveRightMenuItem(): void {
    const defaults = {visible: true, text: 'Move right', group: 'move', accelerator: ['ctrl', 'alt', 'end']};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.moveRight;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      isDisabled: (): boolean => view.first && view.last,
      onAction: (): void => void view.move('east').then(),
    }));
  }

  private registerMoveLeftMenuItem(): void {
    const defaults = {visible: true, text: 'Move left', group: 'move'};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.moveLeft;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      isDisabled: (): boolean => view.first && view.last,
      onAction: (): void => void view.move('west').then(),
    }));
  }

  private registerMoveUpMenuItem(): void {
    const defaults = {visible: true, text: 'Move up', group: 'move'};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.moveUp;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      isDisabled: (): boolean => view.first && view.last,
      onAction: (): void => void view.move('north').then(),
    }));
  }

  private registerMoveDownMenuItem(): void {
    const defaults = {visible: true, text: 'Move down', group: 'move'};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.moveDown;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      isDisabled: (): boolean => view.first && view.last,
      onAction: (): void => void view.move('south').then(),
    }));
  }

  private registerOpenInNewWindowMenuItem(): void {
    const defaults = {visible: true, text: 'Open in new window', group: 'open'};
    const appConfig = this._config.viewMenuItems && this._config.viewMenuItems.moveBlank;
    const config = {...defaults, ...appConfig};

    config.visible && this._workbench.registerViewMenuItem((view: WorkbenchView): WorkbenchMenuItem => ({
      portal: new ComponentPortal(TextComponent, null, new PortalInjector(Injector.NULL, new WeakMap().set(TEXT, config.text))),
      accelerator: config.accelerator,
      group: config.group,
      onAction: (): void => void view.move('blank-window').then(),
    }));
  }
}

/**
 * Returns the pressed modifier keys (ctrl, shift, alt, meta) as array items.
 */
function getModifierState(event: KeyboardEvent): string[] {
  const modifierState: string[] = [];
  if (event.ctrlKey) {
    modifierState.push('ctrl');
  }
  if (event.shiftKey) {
    modifierState.push('shift');
  }
  if (event.altKey) {
    modifierState.push('alt');
  }
  if (event.metaKey) {
    modifierState.push('meta');
  }
  return modifierState;
}

export interface Point {
  x: number;
  y: number;
}
