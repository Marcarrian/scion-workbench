/*
 * Copyright (c) 2018-2019 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */

import { AppPO } from './page-object/app.po';
import { browser } from 'protractor';
import { WelcomePagePO } from './page-object/welcome-page.po';
import { ViewNavigationPO } from './page-object/view-navigation.po';

describe('ViewTabBar', () => {

  const appPO = new AppPO();
  const welcomePagePO = new WelcomePagePO();
  const viewNavigationPO = new ViewNavigationPO();

  beforeEach(async () => {
    await browser.get('/');
  });

  it('should not show if no views are open and no viewpart actions present', async () => {
    await browser.get('/#/?show-open-new-view-tab-action=false');

    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(0);
    await expect(appPO.isViewTabBarShowing()).toBeFalsy();

    await welcomePagePO.clickTile('e2e-tile-view-1');
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(1);
    await expect(appPO.isViewTabBarShowing()).toBeTruthy();

    await appPO.findViewTab('viewpart.1', {cssClass: 'e2e-tile-view-1'}).close();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(0);
    await expect(appPO.isViewTabBarShowing()).toBeFalsy();

    await browser.get('/#/?show-open-new-view-tab-action=true');

    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(0);
    await expect(appPO.isViewTabBarShowing()).toBeTruthy();

    await welcomePagePO.clickTile('e2e-tile-view-1');
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(1);
    await expect(appPO.isViewTabBarShowing()).toBeTruthy();

    await appPO.findViewTab('viewpart.1', {cssClass: 'e2e-tile-view-1'}).close();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(0);
    await expect(appPO.isViewTabBarShowing()).toBeTruthy();
  });

  it('should activate the most recent view when closing a view', async () => {
    await viewNavigationPO.navigateTo();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(1);

    // open view-1
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.enterMatrixParams({viewCssClass: 'e2e-view-1', viewTitle: 'view-1'});
    await viewNavigationPO.checkActivateIfPresent(true);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-1'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(2);

    // open view-2
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.enterMatrixParams({viewCssClass: 'e2e-view-2', viewTitle: 'view-2'});
    await viewNavigationPO.checkActivateIfPresent(true);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-2'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(3);

    // open view-3
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.enterMatrixParams({viewCssClass: 'e2e-view-3', viewTitle: 'view-3'});
    await viewNavigationPO.checkActivateIfPresent(true);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-3'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(4);

    // activate view-2
    await appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-2'}).click();

    await expect(appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-2'}).isActive()).toBeTruthy();

    // activate view-1
    await appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-1'}).click();

    await expect(appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-1'}).isActive()).toBeTruthy();

    // activate view-3
    await appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-3'}).click();

    await expect(appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-3'}).isActive()).toBeTruthy();

    // close view-3
    await appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-3'}).close();

    await expect(appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-1'}).isActive()).toBeTruthy();

    // close view-1
    await appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-1'}).close();

    await expect(appPO.findViewTab('viewpart.1', {cssClass: 'e2e-view-2'}).isActive()).toBeTruthy();
  });

  it('should insert a new view tab into the tabbar after the active view tab by default', async () => {
    await viewNavigationPO.navigateTo();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(1);
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1']);

    // open view.2
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.2'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.2']);

    // open view.3
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.3'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.3', 'view.2']);

    // open view.4
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.4'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.4', 'view.3', 'view.2']);
  });

  it('should insert a new view tab into the tabbar at the end', async () => {
    await viewNavigationPO.navigateTo();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(1);
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1']);

    // open view.2
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex('end');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.2'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.2']);

    // open view.3
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex('end');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.3'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.2', 'view.3']);

    // open view.4
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex('end');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.4'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.2', 'view.3', 'view.4']);
  });

  it('should insert a new view tab into the tabbar at the start', async () => {
    await viewNavigationPO.navigateTo();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(1);
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1']);

    // open view.2
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex('start');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.2'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.2', 'view.1']);

    // open view.3
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex('start');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.3'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.3', 'view.2', 'view.1']);

    // open view.4
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex('start');
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.4'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.4', 'view.3', 'view.2', 'view.1']);
  });

  it('should insert a new view tab into the tabbar at a custom position', async () => {
    await viewNavigationPO.navigateTo();
    await expect(appPO.getViewTabCount('viewpart.1')).toEqual(1);
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1']);

    // open view.2
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex(1);
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.2'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.2']);

    // open view.3
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex(1);
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.3'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.3', 'view.2']);

    // open view.4
    await viewNavigationPO.activateViewTab();
    await viewNavigationPO.enterPath('view');
    await viewNavigationPO.checkActivateIfPresent(false);
    await viewNavigationPO.selectTarget('blank');
    await viewNavigationPO.setInsertionIndex(1);
    await viewNavigationPO.navigate();

    await expect(appPO.findViewTab('viewpart.1', {viewRef: 'view.4'}).isActive()).toBeTruthy();
    await expect(appPO.getViewTabs('viewpart.1')).toEqual(['view.1', 'view.4', 'view.3', 'view.2']);
  });
});
