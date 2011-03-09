﻿/* load after build_application.js */

window.app.builders.EcmascriptDebugger || ( window.app.builders.EcmascriptDebugger = {} );

/**
  * @param {Object} service the service description of the according service on the host side
  */

window.app.builders.EcmascriptDebugger["6.0"] = function(service)
{
  // see diff to %.0 version: hg diff -c 9d4f82a72900
  var namespace = cls.EcmascriptDebugger && cls.EcmascriptDebugger["6.0"];
  var service_interface = window.services['ecmascript-debugger'];

  const NAME = 0, ID = 1, VIEWS = 2;

  if(service_interface)
  {


    cls.InspectableJSObject = namespace.InspectableJSObject;
    // disabled for now. see CORE-32113
    // cls.InspectableJSObject.register_enabled_listener();
    // for now we are filtering on the client side
    cls.InspectableJSObject.create_filters();

    window.runtimes = new namespace.Runtimes("6.0");
    window.runtimes.bind(service_interface);

    window.dom_data = new namespace.DOMData('dom');
    window.dom_data.bind(service_interface);
    window.stop_at = new namespace.StopAt();
    window.stop_at.bind(service_interface);
    window.host_tabs = new namespace.HostTabs();
    window.host_tabs.bind(service_interface);
    window.hostspotlighter = new namespace.Hostspotlighter();
    window.hostspotlighter.bind(service_interface);

    /* ECMA object inspection */
    var BaseView = new namespace.InspectionBaseView();
    namespace.InspectionView.prototype = BaseView;
    new namespace.InspectionView('inspection', ui_strings.M_VIEW_LABEL_FRAME_INSPECTION, 'scroll');
    namespace.InspectionView.create_ui_widgets();

    /* DOM object inspection */
    namespace.DOMAttrsView.prototype = BaseView;
    new namespace.DOMAttrsView('dom_attrs', ui_strings.M_VIEW_LABEL_DOM_ATTR, 'scroll dom-attrs');
    namespace.DOMAttrsView.create_ui_widgets();

    /*
      a namespace for all the followindg classes will only be created
      if needed to adjust them for an updated service version
    */

    window.runtime_onload_handler = new namespace.RuntimeOnloadHandler();

    /* temporary export view */
    window.export_data = new cls.ExportData();
    new cls.ExportDataView('export_data', ui_strings.M_VIEW_LABEL_EXPORT, 'scroll export-data');

    /* commandline */

    cls.CndRtSelect.prototype = new CstSelect();
    new cls.CndRtSelect('cmd-runtime-select', 'cmd-line-runtimes');

    cls.ReplView.create_ui_widgets();
    new cls.ReplView('command_line', "REPL", 'scroll command-line', '', 'repl-focus');

    /* JS source */
    window.simple_js_parser = new window.cls.SimpleJSParser();
    new cls.JsSourceView('js_source', ui_strings.M_VIEW_LABEL_SOURCE, 'scroll js-source');
    new cls.ScriptSelect('js-script-select', 'script-options');
    cls.JsSourceView.create_ui_widgets();

    /* Watches */
    cls.WatchesView.prototype = ViewBase;
    new cls.WatchesView('watches', ui_strings.M_VIEW_LABEL_WATCHES, 'scroll');
    
    /* Runtime State */
    new SidePanelView('scripts-side-panel', 
                      ui_strings.M_VIEW_LABEL_RUNTIME_STATE,
                      ['watches', 'callstack', 'inspection']);

    /* Callstack */
    cls.CallstackView.prototype = ViewBase;
    new cls.CallstackView('callstack', ui_strings.M_VIEW_LABEL_CALLSTACK, 'scroll');

    /* Threads */
    cls.ThreadsView.prototype = ViewBase;
    new cls.ThreadsView('threads', ui_strings.M_VIEW_LABEL_THREAD_LOG, 'scroll threads');
    //cls.ThreadsView.create_ui_widgets();

    /* DOM */
    cls.InspectableDOMNode = namespace.InspectableDOMNode;
    new cls.DOMInspectorActions('dom'); // the view id
    cls.DOMView.prototype = ViewBase;
    new cls.DOMView('dom', ui_strings.M_VIEW_LABEL_DOM, 'scroll dom');
    cls.DOMView.prototype.constructor = cls.DOMView;
    cls.DocumentSelect.prototype = new CstSelect();
    new cls.DocumentSelect('document-select', 'document-options');
    cls.DOMView.create_ui_widgets();

    /* Stylesheets */
    // TODO: remove, this is old
    window.stylesheets = new cls.Stylesheets();
    cls.StylesheetsView.prototype = ViewBase;
    new cls.StylesheetsView('stylesheets', ui_strings.M_VIEW_LABEL_STYLESHEET, 'scroll stylesheets');
    cls.StylesheetSelect.prototype = new CstSelect();
    new cls.StylesheetSelect('stylesheet-select', 'stylesheet-options');
    //cls.StylesheetsView.create_ui_widgets();

    /* CSS inspector */
    window.elementStyle = new cls.ElementStyle();
    cls.CSSInspectorView.prototype = ViewBase;
    new cls.CSSInspectorView('css-inspector', ui_strings.M_VIEW_LABEL_STYLES, 'scroll css-inspector');
    
    cls.CSSInspectorCompStyleView.prototype = ViewBase;
    new cls.CSSInspectorCompStyleView('css-comp-style', ui_strings.M_VIEW_LABEL_COMPUTED_STYLE, 'scroll css-inspector');

    cls.NewStyle.prototype = ViewBase;
    new cls.NewStyle('new-style', 'New Style', 'scroll css-new-style');

    new cls.ColorPickerView('color-selector', 'Color Picker', 'color-selector');
    new cls.CSSInspectorActions('css-inspector');

    /* DOM sidepanel */
    new cls.DOMSidePanelView('dom-side-panel', 
                             ui_strings.M_VIEW_LABEL_STYLES,
                             ['css-comp-style', 'css-inspector', 'new-style']);
    cls.DOMSidePanelView.create_ui_widgets();

    /* Layout */
    window.elementLayout = new cls.ElementLayout();
    cls.CSSLayoutView.prototype = ViewBase;
    new cls.CSSLayoutView('css-layout', ui_strings.M_VIEW_LABEL_LAYOUT, 'scroll css-layout');

    /* Runtime State */
    new SidePanelView('breakpoints-side-panel', 
                      ui_strings.M_VIEW_LABEL_BREAKPOINTS,
                      ['breakpoints', 'event-breakpoints']);

    /* Event Breakpoints */
    window.event_breakpoints = cls.EventBreakpoints.get_instance();
    cls.EventBreakpointsView.prototype = ViewBase;
    new cls.EventBreakpointsView('event-breakpoints', ui_strings.M_VIEW_LABEL_EVENT_BREAKPOINTS, 'scroll event-breakpoints');
    cls.EventBreakpointsView.create_ui_widgets();

    /* Breakpoints */
    cls.BreakpointsView.prototype = ViewBase;
    new cls.BreakpointsView('breakpoints', 'Breakpoints', 'scroll breakpoints');
    cls.BreakpointsView.create_ui_widgets();
    
    /* adjust the base class */

    var StorageDataBase = new namespace.StorageDataBase();
    cls.CookiesData.prototype = StorageDataBase;
    cls.LocalStorageData.prototype = StorageDataBase;

    /* storage objects and cookies */
    new cls.Namespace("storages");
    window.storages.add(new cls.LocalStorageData(
      'local_storage',
      'local-storage',
      ui_strings.M_VIEW_LABEL_LOCAL_STORAGE,
      'localStorage'));
    window.storages.add(new cls.LocalStorageData(
      'session_storage',
      'session-storage',
      ui_strings.M_VIEW_LABEL_SESSION_STORAGE,
      'sessionStorage'));
    window.storages.add(new cls.LocalStorageData(
      'widget_preferences',
      'widget-preferences',
      ui_strings.M_VIEW_LABEL_WIDGET_PREFERNCES,
      'widget.preferences'));
    window.storages.add(new cls.CookiesData(
      'cookies',
      'cookies',
      ui_strings.M_VIEW_LABEL_COOKIES));
    new cls.StorageView('local_storage', ui_strings.M_VIEW_LABEL_LOCAL_STORAGE, 'scroll');
    new cls.StorageView('session_storage', ui_strings.M_VIEW_LABEL_SESSION_STORAGE, 'scroll');
    new cls.StorageView('cookies', ui_strings.M_VIEW_LABEL_COOKIES, 'scroll');
    new cls.StorageView('widget_preferences', ui_strings.M_VIEW_LABEL_WIDGET_PREFERNCES, 'scroll');
    new cls.StorageViewActions('storage-view');
    cls.StorageView.create_ui_widgets();

    /* the following views must be created to get entry in the Settings tab */

    /* Environment */
    cls.EnvironmentView.prototype = ViewBase;
    new cls.EnvironmentView('environment', ui_strings.M_VIEW_LABEL_ENVIRONMENT, 'scroll');
    cls.EnvironmentView.create_ui_widgets();

    /* About */
    cls.AboutView.prototype = ViewBase;
    new cls.AboutView('about', 'About', 'scroll');
    cls.AboutView.create_ui_widgets();

    /* Hostspotlighter */
    cls.HostSpotlightView.prototype = ViewBase;
    new cls.HostSpotlightView('host-spotlight', ui_strings.S_LABEL_SPOTLIGHT_TITLE, '');
    cls.HostSpotlightView.create_ui_widgets();

    /* main view doesn't really exist */
    cls.MainView.create_ui_widgets();


  }

}
