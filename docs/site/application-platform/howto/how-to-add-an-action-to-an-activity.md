<a href="/docs/site/application-platform/README.md"><img src="/resources/branding/scion-workbench-banner.svg" height="50" alt="SCION Workbench Application Platform"></a>

| SCION Workbench Application Platform | [Projects Overview][menu-projects-overview] | [Changelog][menu-changelog] | [Contributing][menu-contributing] | [Sponsoring][menu-sponsoring] |  
| --- | --- | --- | --- | --- |

## [SCION Workbench Application Platform][menu-home] > [How To Guides][menu-how-to] > Activity

#### How to add an action to an activity
To add an action to an activity, open the template of the activity component and add an `<ng-container>` element decorated with the action directive you want to add.

> If not using Angular, register the action via `ActivityService` and provide the action you want.

The following actions are available in the Workbench Application Platform. You can also develop custom actions.

- **Action to open an external site**
  
  Use this action to open an external site with given URL.

  ```html
  <ng-container wbUrlOpenActivityAction
                label="open_in_new"
                title="Open Google"
                cssClass="material-icons"
                url="https://www.google.com">
  </ng-container>
  ```

  Or you can add the action programmatically as follows:

  ```typescript 
  const action: UrlOpenActivityAction = {
    type: PlatformActivityActionTypes.UrlOpen,
    properties: {
      label: 'open_in_new',
      title: 'Open Google',
      cssClass: 'material-icons',
      url: 'https://www.google.com',
    }
  };
  Platform.getService(ActivityService).addAction(action);
  ```
  
  Following properties are supported:

  |property|type|mandatory|description|
  |-|-|-|-|
  |url|string|✓|Specifies the URL to open when the button is clicked.|
  |label|string||Specifies the label of the button.|
  |title|string||Specifies the title of the button.|
  |cssClass|string&nbsp;\|&nbsp;string[]||Specifies the CSS class(es) set to the button.|

- **Action to open a view**
  
  Use this action to open a view provided by some view capability.

  ```html
  <ng-container wbViewOpenActivityAction
                label="add"
                cssClass="material-icons"
                [qualifier]="{...}">
  </ng-container>
  ```

  Or you can add the action programmatically as follows:

  ```typescript 
  const action: ViewOpenActivityAction = {
    type: PlatformActivityActionTypes.ViewOpen,
    properties: {
      label="add"
      cssClass="material-icons"
      qualifier: {...},
    }
  };
  Platform.getService(ActivityService).addAction(action);
  ```

  Following properties are supported:

  |property|type|mandatory|description|
  |-|-|-|-|
  |qualifier|dictionary|✓|Qualifies the view to open.|
  |label|string||Specifies the label of the button.|
  |title|string||Specifies the title of the button.|
  |cssClass|string&nbsp;\|&nbsp;string[]||Specifies the CSS class(es) set to the button.|
  |queryParams|dictionary||Specifies optional query parameters to open the view.|
  |matrixParams|dictionary||Specifies optional matrix parameters to open the view.|  
  |activateIfPresent|boolean||Activates the view if it is already present.|  
  |closeIfPresent|boolean||Closes the view if present. Has no effect if no view is present which matches the qualifier.|

- **Action to open a popup**
  
  Use this action to open a popup provided by some popup capability.

  ```html
  <ng-container wbPopupOpenActivityAction
                label="add"
                cssClass="material-icons"
                [qualifier]="{...}">
  </ng-container>
  ```

  Or you can add the action programmatically as follows:

  ```typescript 
  const action: PopupOpenActivityAction = {
    type: PlatformActivityActionTypes.PopupOpen,
    properties: {
      label="add"
      cssClass="material-icons"
      qualifier: {...},
    }
  };
  Platform.getService(ActivityService).addAction(action);
  ```

  Following properties are supported:

  |property|type|mandatory|description|
  |-|-|-|-|
  |qualifier|dictionary|✓|Qualifies the popup to open.|
  |label|string||Specifies the label of the button.|
  |title|string||Specifies the title of the button.|
  |cssClass|string&nbsp;\|&nbsp;string[]||Specifies the CSS class(es) set to the button.|
  |queryParams|dictionary||Specifies optional query parameters to open the popup.|
  |matrixParams|dictionary||Specifies optional matrix parameters to open the popup.|  
  |onFocusLost|boolean||Specifies if to close the popup on focus lost, which is `true` by default.|  
  |onEscape|boolean||Specifies if to close the popup on escape keystroke, which is `true` by default.|
  |onGridLayoutChange|boolean||Specifies if to close the popup on workbench view grid change, which is `true` by default.|    

[menu-how-to]: /docs/site/application-platform/howto/how-to.md

[menu-home]: /docs/site/application-platform/README.md
[menu-projects-overview]: /docs/site/projects-overview.md
[menu-changelog]: /docs/site/changelog/changelog.md
[menu-contributing]: /CONTRIBUTING.md
[menu-sponsoring]: /docs/site/sponsoring.md
