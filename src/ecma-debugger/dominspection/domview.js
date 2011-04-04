﻿window.cls || (window.cls = {});

/**
  * @constructor 
  * @extends DOM_markup_style
  */

cls.DOMView = function(id, name, container_class)
{

  this.createView = function(container)
  {
    if (this._create_view_no_data_timeout)
    {
      clearTimeout(this._create_view_no_data_timeout);
      this._create_view_no_data_timeout = 0;
    }
    if (dom_data.has_data())
    {
      var model = window.dominspections.active;
      var scrollTop = container.scrollTop;      
      container.clearAndRender(window.templates.inspected_dom_node(window.dom_data, 
                                                                   model && model.target, 
                                                                   true));
      if (!window.helpers.scroll_dom_target_into_view())
      {
        container.scrollTop = scrollTop;
      }
      if (model == window.dom_data)
      {
        if (!this._modebar)
        {
          this._modebar = UI.get_instance().get_modebar('dom');
        }
        if (this._modebar)
        {
          this._modebar.set_content(model.id, 
                                    window.templates.breadcrumb(model, model.target),
                                    true);
        }
      }
      window.messages.post('dom-view-updated', {model: model});
    }
    else
    {
      this._create_view_no_data_timeout = setTimeout(this._create_view_no_data, 100, container);
    }
  };

  this._create_view_no_data_timeout = 0;

  this._create_view_no_data = function(container)
  {
    if(!dom_data.getDataRuntimeId())
    {
      container.innerHTML = 
        "<div class='padding'><div class='info-box'>" +
          ui_strings.S_INFO_WINDOW_HAS_NO_RUNTIME +
        "</div></div>";
    }
    else
    {
      container.innerHTML = "<div class='padding' edit-handler='edit-dom'><p></p></div>";
    }
  }

  this.ondestroy = function()
  {
    window.hostspotlighter.clearSpotlight();
  }

  this._on_setting_change = function(msg)
  {
    if( msg.id == this.id )
    {
      switch (msg.key)
      {
        case 'dom-tree-style':
        {
          this.update();
          break;
        }
      }
    }
  }

  messages.addListener('setting-changed', this._on_setting_change.bind(this));
  this.init(id, name, container_class);

}

cls.DocumentSelect = function(id)
{

  var selected_value = "";

  this.getSelectedOptionText = function()
  {
    var selected_rt_id = dom_data.getDataRuntimeId();
    if(selected_rt_id)
    {
      var rt = runtimes.getRuntime(selected_rt_id);
      if( rt )
      {
        return rt['title'] || helpers.shortenURI(rt.uri).uri;
      }
    }
    return '';
  }

  this.getSelectedOptionValue = function()
  {

  }

  this.templateOptionList = function(select_obj)
  {
    
    // TODO this is a relict of protocol 3, needs cleanup
    var active_window_id = runtimes.getActiveWindowId();

    if( active_window_id )
    {
      var 
      _runtimes = runtimes.getRuntimes(active_window_id),
      rt = null, 
      i = 0;

      // remove the extension runtimes from the document 
      // selector dropdown in the DOM view
      _runtimes = _runtimes.filter(function(runtime)
      {
        return ["extensionjs"].indexOf(runtime.description) == -1;
      });
      for( ; ( rt = _runtimes[i] ) && !rt['selected']; i++);
      if( !rt && _runtimes[0] )
      {
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE + 'no runtime selected')
        return;
      }
      return templates.runtimes(_runtimes, 'dom');
    }
    
  }

  this.checkChange = function(target_ele)
  {
    var rt_id = parseInt(target_ele.getAttribute('runtime-id'));

    if( rt_id != dom_data.getDataRuntimeId() )
    {
      if(rt_id)
      {
        dom_data.get_dom(rt_id);
      }
      else
      {
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "missing runtime id in cls.DocumentSelect.checkChange")
      }
      return true;
    }
    return false;
  }

  // this.updateElement

  this.init(id);
}


cls.DOMView.create_ui_widgets = function()
{

  new Settings
  (
    // id
    'dom', 
    // kel-value map
    {

      'find-with-click': true,
      'highlight-on-hover': true,
      'update-on-dom-node-inserted': false,
      'force-lowercase': true, 
      'show-comments': true, 
      'show-whitespace-nodes': true,
      'dom-tree-style': false,
      'show-siblings-in-breadcrumb': false,
      'show-id_and_classes-in-breadcrumb': true,
      'scroll-into-view-on-spotlight': true,
      'lock-selected-elements': false
    }, 
    // key-label map
    {
      'find-with-click': ui_strings.S_SWITCH_FIND_ELEMENT_BY_CLICKING,
      // TODO change to highlight
      'highlight-on-hover': ui_strings.S_SWITCH_HIGHLIGHT_SELECTED_OR_HOVERED_ELEMENT,
      'update-on-dom-node-inserted': ui_strings.S_SWITCH_UPDATE_DOM_ON_NODE_REMOVE,
      'force-lowercase': ui_strings.S_SWITCH_USE_LOWER_CASE_TAG_NAMES, 
      'show-comments': ui_strings.S_SWITCH_SHOW_COMMENT_NODES, 
      'show-whitespace-nodes': ui_strings.S_SWITCH_SHOW_WHITE_SPACE_NODES,
      'dom-tree-style': ui_strings.S_SWITCH_SHOW_DOM_INTREE_VIEW,
      'show-siblings-in-breadcrumb': ui_strings.S_SWITCH_SHOW_SIBLINGS_IN_BREAD_CRUMB,
      'show-id_and_classes-in-breadcrumb': ui_strings.S_SWITCH_SHOW_ID_AND_CLASSES_IN_BREAD_CRUMB,
      'scroll-into-view-on-spotlight': ui_strings.S_SWITCH_SCROLL_INTO_VIEW_ON_FIRST_SPOTLIGHT,
      'lock-selected-elements': ui_strings.S_SWITCH_LOCK_SELECTED_ELEMENTS
    
    },
    // settings map
    {
      checkboxes:
      [
        'force-lowercase',
        'dom-tree-style',
        'show-comments',
        'show-whitespace-nodes',
        'find-with-click',
        'highlight-on-hover',
        'update-on-dom-node-inserted',
        'show-siblings-in-breadcrumb',
        'show-id_and_classes-in-breadcrumb',
        'scroll-into-view-on-spotlight',
        'lock-selected-elements'
      ],
      contextmenu:
      [
        'dom-tree-style',
        'show-comments',
        'lock-selected-elements'
      ]
    },
    null,
    "document",
    // default callback map on setting change
    // called as method of the settings object
    {
      "lock-selected-elements": function(value)
      {
        if (value && !this.get('highlight-on-hover'))
        {
          this.set('highlight-on-hover', true, true);
        }
      },
    }
  );

  new ToolbarConfig
  (
    'dom',
    [
      {
        handler: 'dom-inspection-snapshot',
        title: ui_strings.S_BUTTON_LABEL_GET_THE_WOHLE_TREE
      },
      {
        handler: 'dom-inspection-export',
        title: ui_strings.S_BUTTON_LABEL_EXPORT_DOM
      }
    ], 
    null, 
    /*
    [
      {
        handler: 'dom-text-search',
        shortcuts: 'dom-text-search',
        title: ui_strings.S_INPUT_DEFAULT_TEXT_SEARCH
      }
    ], */
    null,
    [
      {
        handler: 'select-window',
        title: ui_strings.S_BUTTON_LABEL_SELECT_WINDOW,
        type: 'dropdown',
        class: 'window-select-dropdown',
        template: window['cst-selects']['document-select'].getTemplate()
      }
    ],
    true
  )

  var broker = ActionBroker.get_instance();
  var contextmenu = ContextMenu.get_instance();

  var dom_element_common_items = [
    {
      label: ui_strings.M_CONTEXTMENU_EDIT_MARKUP,
      handler: contextmenu_edit_markup
    },
    {
      label: ui_strings.M_CONTEXTMENU_REMOVE_NODE,
      handler: contextmenu_remove_node
    }
  ];

  contextmenu.register("dom-element", [
    {
      callback: function(event, target)
      {
        var target = event.target;
        var ele = target.has_attr("parent-node-chain", "ref-id");
        if (ele && ele.hasClass("non-editable"))
        {
          return;
        }

        var menu = [];
        while (target != document && !/^(?:key|value|text|node)$/i.test(target.nodeName))
        {
          target = target.parentNode;
        }

        switch (target.nodeName.toLowerCase())
        {
        case "node":
          var toggle = target.parentNode.querySelector("[handler='get-children']");
          var is_open = toggle ? toggle.hasClass("open") : null;
          menu = [
            {
              label: ui_strings.M_CONTEXTMENU_ADD_ATTRIBUTE,
              handler: contextmenu_add_attribute
            }
          ]
          .concat(ContextMenu.separator)
          .concat(dom_element_common_items);

          if (toggle)
          {
            menu.extend([
              ContextMenu.separator,
              {
                label: is_open ? ui_strings.M_CONTEXTMENU_COLLAPSE_SUBTREE
                               : ui_strings.M_CONTEXTMENU_EXPAND_SUBTREE,
                handler: function contextmenu_expand_collapse_subtree(event, target) {
                  broker.dispatch_action("dom", "expand-collapse-whole-node", event, event.target);
                }
              }
            ]);
          }
          break;

        case "key":
          menu = [
            {
              label: ui_strings.M_CONTEXTMENU_EDIT_ATTRIBUTE,
              handler: contextmenu_edit_dom
            },
            {
              label: ui_strings.M_CONTEXTMENU_ADD_ATTRIBUTE,
              handler: contextmenu_add_attribute
            }/*,
            {
              label: "Remove attribute", // Add ui string
              handler: contextmenu_remove_attribute
            }*/
          ]
          .concat(ContextMenu.separator)
          .concat(dom_element_common_items);
          break;

        case "value":
          menu = [
            {
              label: ui_strings.M_CONTEXTMENU_EDIT_ATTRIBUTE_VALUE,
              handler: contextmenu_edit_dom
            },
            {
              label: ui_strings.M_CONTEXTMENU_ADD_ATTRIBUTE,
              handler: contextmenu_add_attribute
            }
          ]
          .concat(ContextMenu.separator)
          .concat(dom_element_common_items);
          break;

        case "text":
          menu = [
            {
              label: ui_strings.M_CONTEXTMENU_EDIT_TEXT,
              handler: contextmenu_edit_dom
            }
          ];
          break;
        }

        return menu;
      }
    }
  ]);

  function contextmenu_edit_dom(event, target)
  {
    broker.dispatch_action("dom", "edit-dom", event, event.target);
  }

  function contextmenu_edit_markup(event, target)
  {
    target = event.target;
    while (target && target.nodeName.toLowerCase() != "node")
    {
      target = target.parentNode;
    }

    if (target)
    {
      broker.dispatch_action("dom", "edit-dom", event, target);
    }
  }

  function contextmenu_add_attribute(event, target)
  {
    broker.dispatch_action("dom", "insert-attribute-edit", event, event.target);
  }

  function contextmenu_remove_attribute(event, target)
  {
    broker.dispatch_action("dom", "remove-attribute", event, event.target);
  }

  function contextmenu_remove_node(event, target)
  {
    broker.dispatch_action("dom", "remove-node", event, event.target);
  }

  new Switches
  (
    'dom',
    [
      'find-with-click',
      'highlight-on-hover',
      'update-on-dom-node-inserted'
    ]
  );

  var search = new Search('dom', [Searchbar]);

  window.messages.addListener('dom-view-updated', function(msg)
  {
    if (msg.model == window.dominspections.active)
    {
      search.update_search();
    }
  });



};
