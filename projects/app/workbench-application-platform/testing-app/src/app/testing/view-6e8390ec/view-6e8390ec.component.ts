/*
 * Copyright (c) 2018 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */

import { Component } from '@angular/core';
import { provideWorkbenchView } from '@scion/workbench-application.angular';
import { ActivatedRoute, Params } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-view-6e8390ec',
  templateUrl: './view-6e8390ec.component.html',
  styleUrls: ['./view-6e8390ec.component.scss'],
  providers: [
    provideWorkbenchView(View6e8390ecComponent),
  ],
})
export class View6e8390ecComponent {

  public params$: Observable<Params>;
  public queryParams$: Observable<Params>;

  constructor(route: ActivatedRoute) {
    this.params$ = route.params;
    this.queryParams$ = route.queryParams;
  }
}
