﻿var cls = window.cls || ( window.cls = {} );

cls.JsSourceView = function(id, name, container_class)
{
  // TODO this view can just be visible once at the time otherwise there will be problems
  // this must be refactored. line_arr, state_arr, breakpoints must be added to the script object
  // getting context values must move out of this class
  // split out one general class to handle partial view ( yield count of lines )

  var self = this;
  var frame_id = 'js-source';
  var container_id = 'js-source-content';
  var container_line_nr_id = 'js-source-line-numbers';
  var scroll_id = 'js-source-scroller';
  var scroll_container_id = 'js-source-scroll-container';
  var container_breakpoints_id = 'break-point-container';
  var horizontal_scoller = 'js-source-scroll-content';

  var context = {};

  var __current_script = {};

  var source_content = null;

  var line_numbers = null;

  var max_lines = 0;



  var __current_line = 0;

  var __current_pointer_script_id = 0;

  var __target_scroll_top = -1;
  var __view_is_destroyed = true;
  var __disregard_scroll_event = false;

  var __isHorizontalScrollbar = false;

  var __timeoutUpdateLayout = 0;

  var __highlight_line_start = -1;
  var __highlight_line_end = -1;

  var templates = {};

  var __timeout_clear_view = 0;
  var __container = null;
  var view_invalid = true;

  const
  LINE_POINTER_TOP = window.cls.NewScript.LINE_POINTER_TOP,
  LINE_POINTER = window.cls.NewScript.LINE_POINTER,
  BP_IMAGE_LINE_HEIGHT = 24,
  BP_IMAGE_HEIGHT = 12;

  templates.line_nummer_container = function(lines)
  {
    var ret = ['ul'], i = 0;
    for( ; i<lines; i++)
    {
      ret[ret.length] = templates.line_nummer();
    }
    return ret.concat(['id', container_line_nr_id]);
  }

  templates.line_nummer = function()
  {
    return ['li',
      ['input'],
      ['span', 'handler', 'set-break-point'],
    ];
  }

  var updateLineNumbers = function(fromLine)
  {
    var lines = line_numbers.getElementsByTagName('input'), line = null, i=0;
    var breakpoints = line_numbers.getElementsByTagName('span');
    if (__current_script.line_arr)
    {
      for (; line = lines[i]; i++)
      {
        line.value = fromLine++;
      }
      updateBreakpoints();
    }
    else
    {
      lines[0].value = 1;
    }
  }

  var clearLineNumbers = function()
  {
    var lines = line_numbers.getElementsByTagName('input'), line = null, i=0;

    var breakpoints = line_numbers.getElementsByTagName('span');


    for( ; line = lines[i]; i++)
    {
      if( i == 0 )
      {
        line.value = '1';
      }
      else
      {
        line.value = '';
      }
      // workaround crash bug
      //breakpoints[i].style.removeProperty('background-position');
      breakpoints[i].style.backgroundPosition = '0 0';
    }


  }

  var updateBreakpoints = function(force_repaint)
  {
    if (force_repaint)
    {
      line_numbers.style.visibility = "hidden";
    }
    var lines = line_numbers.getElementsByTagName('span');
    var bp_states = __current_script.breakpoint_states;
    var default_y = context['bp-line-pointer-default'];
    var line_height = context['line-height'];
    if (bp_states)
    {
      for (var i = 0, line, y; line = lines[i]; i++)
      {
        if (bp_states[__current_line + i])
        {
          y = default_y - 1 * bp_states[__current_line + i] * BP_IMAGE_LINE_HEIGHT;
          line.style.backgroundPosition = '0 ' + y + 'px';
        }
        else
        {
          line.style.backgroundPosition = '0 0';
        }
      }
    }
    if (force_repaint)
    {
      setTimeout(repaint_line_numbers, 0);
    }
  };

  var repaint_line_numbers = function()
  {
    if (line_numbers)
    {
      line_numbers.style.visibility = "visible";
    }
  };

  this._set_style = function()
  {
    context['line-height'] = defaults['js-source-line-height'];
    context['scrollbar-width'] = defaults['scrollbar-width'];
    context['bp-line-pointer-default'] =
      (defaults['js-source-line-height'] - BP_IMAGE_HEIGHT) / 2 >> 0;
    var style = null;
    var sheets = document.styleSheets;
    if (style = sheets.getDeclaration('#js-source-scroll-container'))
    {
      style.width = defaults['scrollbar-width'] + 'px';
    }
    if (style = sheets.getDeclaration('#js-source-content div'))
    {
      style.lineHeight = style.height = context['line-height'] + 'px';
    }
    if (style = sheets.getDeclaration('#js-source-line-numbers li'))
    {
      style.height = context['line-height'] + 'px';
    }
  }

  this.createView = function(container)
  {
    // TODO this must be refactored
    // the challenge is to do as less as possible in the right moment
    view_invalid = view_invalid
    && __current_script.script_id
    && runtimes.getSelectedScript()
    && runtimes.getSelectedScript() != __current_script.script_id
    || !runtimes.getSelectedScript();
    if( view_invalid )
    {
      __current_script = {};
      __current_line = 0;
    }
    __container = container;
    frame_id = container.id;
    container.innerHTML = "" +
      "<div id='js-source-scroll-content'>"+
        "<div id='js-source-content' class='js-source' data-menu='js-source-content'></div>"+
      "</div>"+
      "<div id='js-source-scroll-container' handler='scroll-js-source'>"+
        "<div id='js-source-scroller'></div>"+
      "</div>";
    if (!context['line-height'])
    {
      this._set_style();
    }
    context['container-height'] = parseInt(container.style.height);
    var set = null, i = 0;
    source_content = document.getElementById(container_id);
    if(source_content)
    {
      if(document.getElementById(scroll_container_id))
      {
        document.getElementById(scroll_container_id).onscroll = this.scroll;
      }
      max_lines = context['container-height'] / context['line-height'] >> 0;
      var lines = document.getElementById(container_line_nr_id);
      if( lines )
      {
        lines.parentElement.removeChild(lines);
      }
      container.render(templates.line_nummer_container(max_lines || 1));
      line_numbers = document.getElementById(container_line_nr_id);

      var selected_script_id = runtimes.getSelectedScript();
      if(selected_script_id && selected_script_id != __current_script.script_id)
      {
        var stop_at = runtimes.getStoppedAt(selected_script_id);
        if(stop_at && stop_at[0])
        {
          var line = parseInt( stop_at[0].line_number );
          var plus_lines = max_lines <= 10
            ? max_lines / 2 >> 0
            : 10;
          this.showLine(selected_script_id, line - plus_lines);
          this.showLinePointer( line, true );
        }
        else
        {
          this.showLine(selected_script_id, 0);
        }
      }
      else if(__current_script.script_id)
      {
        setScriptContext(__current_script.script_id, __current_line);
        this.showLine(__current_script.script_id, __current_line);
      }
      else
      {
        updateLineNumbers(0);
        if(runtimes.getSelectedRuntimeId())
        {
          document.getElementById(horizontal_scoller).render(
              runtimes.isReloadedWindow(runtimes.getActiveWindowId()) ?
              ['div',
                ['p', ui_strings.S_INFO_RUNTIME_HAS_NO_SCRIPTS],
                'class', 'info-box'
              ] :
              ['div',
                ['button',
                  'class', 'container-button',
                  'handler', 'reload-window'],
                ['p', ui_strings.S_INFO_RELOAD_FOR_SCRIPT],
                'class', 'info-box'
              ]
            );
        }
        else
        {
          document.getElementById(horizontal_scoller).render(
              ['div',
                ['p', ui_strings.S_INFO_WINDOW_HAS_NO_RUNTIME],
                'class', 'info-box'
              ]
            );
        }
      }

    }
  }

  this.onresize = function(container)
  {
    if(this.isvisible())
    {
      __view_is_destroyed = true;
      this.createView(container);
      messages.post('view-created', {id: this.id, container: container});
    }
  }


  var updateLayout = function()
  {
    // not used
    if( source_content && source_content.innerHTML )
    {
      source_content.innerHTML = '';
    }
    if( !__timeoutUpdateLayout )
    {
      __timeoutUpdateLayout = setTimeout(__updateLayout, 60);
    }
  }

  var __updateLayout = function()
  {
    if( __current_script.line_arr )
    {
      self.setup();
      setScriptContext(__current_script.script_id, __current_line);
      self.showLine(__current_script.script_id, __current_line);
    }
    else
    {
      self.setup(1);
    }
    __timeoutUpdateLayout = 0;
  }

  var getMaxLineLength = function()
  {
    var i = 0,
      max = 0,
      max_index = 0,
      previous = 0,
      line_arr = __current_script.line_arr,
      length = line_arr.length;
    for( ; i < length; i++)
    {
      if( ( line_arr[i] - previous ) > max )
      {
        max = line_arr[i] - previous;
        max_index = i;
      }
      previous = line_arr[i];
    }
    return max_index;
  }

  var updateScriptContext = function()
  {
    if (__current_script.scroll_width &&
        source_content.firstChild &&
        __current_script.scroll_width > source_content.firstChild.firstChild.offsetWidth)
    {
      document.getElementById(scroll_container_id).style.bottom =
          context['scrollbar-width'] + 'px';
      source_content.style.width = __current_script.scroll_width +'px';
    }
    else
    {
      document.getElementById(scroll_container_id).style.removeProperty('bottom');
      source_content.style.removeProperty('width');
    }
    document.getElementById(scroll_id).style.height = __current_script.scroll_height + 'px';
    if( __current_script.scroll_height > context['line-height'] * max_lines )
    {
      document.getElementById(horizontal_scoller).style.right =
        context['scrollbar-width'] + 'px';
    }
    else
    {
      document.getElementById(horizontal_scoller).style.right = '0px';
    }
  }

  var setScriptContext = function(script_id, line_nr)
  {
    source_content.innerHTML = "<div style='visibility:hidden'>" +
      simple_js_parser.format(__current_script, getMaxLineLength() - 1, 1).join('') + "</div>";
    var scrollWidth = __current_script.scroll_width = source_content.firstChild.firstChild.scrollWidth + 7;
    var offsetWidth = source_content.firstChild.firstChild.offsetWidth;
    // ensure that a scrollbar is also displayed with very long one-liner scripts
    // max width which produces a scrollbar is 0x7FFF - 1
    if(__current_script.scroll_width > 0x7FFE)
    {
      __current_script.scroll_width = 0x7FFE;
    }
    if( scrollWidth > offsetWidth )
    {
      max_lines =
        ( context['container-height'] - context['scrollbar-width'] ) / context['line-height'] >> 0;
    }
    else
    {
      max_lines = context['container-height'] / context['line-height'] >> 0;
    }
    if( max_lines > __current_script.line_arr.length )
    {
      max_lines = __current_script.line_arr.length;
    }
    var lines = document.getElementById(container_line_nr_id);

    if( lines )
    {
      lines.parentElement.removeChild(lines);
    }
    document.getElementById(frame_id).render(templates.line_nummer_container(max_lines));
    line_numbers = document.getElementById(container_line_nr_id);
    source_content.style.height = ( context['line-height'] * max_lines ) +'px';
    __current_script.scroll_height = __current_script.line_arr.length * context['line-height'];
    updateScriptContext();
    source_content.innerHTML = "";
    return true;
  }

  var clearScriptContext = function()
  {
    max_lines = 1;
    document.getElementById(scroll_container_id).style.removeProperty('bottom');
    source_content.style.removeProperty('width');
    var lines = document.getElementById(container_line_nr_id);
    lines.parentElement.removeChild(lines);
    document.getElementById(frame_id).render(templates.line_nummer_container(max_lines));
    document.getElementById(scroll_id).style.height = 'auto';
    document.getElementById(horizontal_scoller).style.right = '0px';
  }

  // deprecated. use this.show_and_flash_line instead.
  this.highlight = function(script_id, line_nr, highlight_line_start, highlight_line_end)
  {
    if (this.isvisible())
    {
      this.show_and_flash_line(script_id, line_nr);
    }
  }

  this.show_and_flash_line = function(script_id, line_nr)
  {
    this.showLine(script_id, line_nr - 10);
    var source_content = document.getElementById(container_id);
    var lines = source_content && source_content.getElementsByTagName('div');
    var line = lines && lines[line_nr - __current_line];
    if (line)
    {
      line.addClass('selected-js-source-line');
      setTimeout(function(){line.removeClass('selected-js-source-line')}, 800);
    }
  }

  // return boolean for the visibility of this view
  this.showLine = function(script_id,
                           line_nr,
                           clear_scroll,
                           is_parse_error,
                           update_scroll_height,
                           keep_line_highlight)
  {
    // too often called?

    if (!keep_line_highlight)
    {
      __highlight_line_start = -1;
      __highlight_line_end = -1;
    }

    if( __timeout_clear_view )
    {
      __timeout_clear_view = clearTimeout( __timeout_clear_view );
    }

    var is_visible = ( source_content = document.getElementById(container_id) ) ? true : false;
    // if the view is visible it shows the first new script
    // before any parse error, that means in case of a parse error
    // the current script has not set the parse_error property
    if(__current_script.parse_error)
    {
      is_parse_error = true;
    }
    if (__current_script.script_id != script_id || is_parse_error)
    {
      var script_obj = runtimes.getScript(script_id);

      if( script_obj )
      {
        if (!script_obj.line_arr)
        {
          script_obj.set_line_states();
        }
        __current_script = script_obj;
        if (script_obj.parse_error)
        {
          var error_line = 0;
          while(error_line < script_obj.line_arr.length &&
              script_obj.line_arr[error_line] < script_obj.parse_error.offset)
          {
            error_line++;
          }
          script_obj.parse_error.error_line = error_line - 1;
          script_obj.parse_error.error_line_offset =
            script_obj.parse_error.offset - script_obj.line_arr[error_line - 1];
        }
        if (is_visible)
        {
          setScriptContext(script_id, line_nr);
        }
        messages.post('script-selected', {script_id: script_id});
        runtimes.setSelectedScript(script_id);
      }
      else
      {
        document.getElementById(scroll_id).innerHTML = "";
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          "script source is missing for given id in views.js_source.showLine");
        return;
      }
      // reset the stored current line to ensure
      // that the view gets updated in the next block
      __current_line = 0;
    }
    if( line_nr < 1 )
    {
      line_nr = 1;
    }
    else if( line_nr > __current_script.line_arr.length - max_lines )
    {
      line_nr = __current_script.line_arr.length - max_lines + 1;
    }

    if (is_visible)
    {
      if (!__current_script.scroll_width)
      {
        setScriptContext(script_id, line_nr);
      }
      if (view_invalid)
      {
        updateScriptContext();
      }
      // TODO check if __current_line != line_nr makes any sense
      if (__current_line != line_nr || __view_is_destroyed || !source_content.innerHTML)
      {
        source_content.innerHTML = simple_js_parser.format(__current_script,
                                                           line_nr - 1,
                                                           max_lines - 1,
                                                           __highlight_line_start,
                                                           __highlight_line_end).join('');
        __current_line = line_nr;
        __view_is_destroyed = false;
        updateLineNumbers(line_nr);
        var scroll_container = !(update_scroll_height === false) && document.getElementById(scroll_container_id);
        if(scroll_container)
        {
          __disregard_scroll_event = true;
          // setting scrollTop will trigger a scroll event
          scroll_container.scrollTop =
            __current_line / __current_script.line_arr.length * scroll_container.scrollHeight;
        }
      }
      if(__current_script.parse_error)
      {
        views.js_source.showLinePointer(__current_script.parse_error.error_line + 1, true )
      }
    }
    __current_line = line_nr;
    view_invalid = false;
    // clear_scroll is never set in a real scroll event
    if(!clear_scroll)
    {
      messages.post
      (
        'view-scrolled',
        {
          id: this.id,
          top_line: this.getTopLine(),
          bottom_line: this.getBottomLine()
        }
      );
    }

    return is_visible;

  }

  this.getTopLine = function()
  {
    return __current_line;
  }

  this.getMaxLines = function()
  {
    return max_lines;
  }

  this.getBottomLine = function()
  {
    return __current_line + max_lines;
  }

  /* first allays use showLine */
  this.showLinePointer = function(line, is_top_frame)
  {
    this._clear_line_pointer(false);
    var bp_states = __current_script && __current_script.breakpoint_states;
    if (bp_states)
    {
      __current_pointer_script_id = __current_script.script_id;
      __current_script.line_pointer.line = line;
      __current_script.line_pointer.state = is_top_frame ?
                                            LINE_POINTER_TOP :
                                            LINE_POINTER;
      if (!bp_states[line])
      {
        bp_states[line] = 0;
      }
      bp_states[line] += __current_script.line_pointer.state;
    }
    updateBreakpoints(true);
  };

  this.clearLinePointer = function(do_not_update)
  {
    this._clear_line_pointer();
    if (do_not_update !== false)
    {
      updateBreakpoints();
    }
  };

  this._clear_line_pointer = function()
  {
    if (__current_pointer_script_id)
    {
      var p_s = window.runtimes.getScript(__current_pointer_script_id);
      if (p_s)
      {
        p_s.breakpoint_states[p_s.line_pointer.line] -= p_s.line_pointer.state;
        p_s.line_pointer.line = 0;
        p_s.line_pointer.state = 0;
      }
      __current_pointer_script_id = 0;
    }
  };

  this.scroll = function()
  {
    if (!view_invalid && !__disregard_scroll_event)
    {
      var top = document.getElementById(scroll_container_id).scrollTop;
      var target_line = Math.ceil(top / context['line-height']);
      if (__current_line != target_line)
      {
        self.showLine(__current_script.script_id, target_line, null, null, false, true);
      }
    }
    __disregard_scroll_event = false;
  }

  this.getCurrentScriptId = function()
  {
    return __current_script && __current_script.script_id;
  }


  this.clearView = function()
  {
    if( !__timeout_clear_view )
    {
      __timeout_clear_view = setTimeout( __clearView, 100);
    }
  }

  var __clearView = function()
  {
    if( ( source_content = document.getElementById(container_id) ) && source_content.parentElement )
    {
      var
      divs = source_content.parentElement.parentElement.getElementsByTagName('div'),
      div = null,
      i = 0;

      source_content.innerHTML = '';
      for( ; div = divs[i]; i++)
      {
        div.removeAttribute('style');
      }
      clearLineNumbers();
    }
    self.clearLinePointer();
    __current_line = 0;
    __timeout_clear_view = 0;
    view_invalid = true;
    __view_is_destroyed = true;
  }

  var onRuntimeDestroyed = function(msg)
  {
    // TODO this is not good, clean up the the local __current_script
    if( __current_script && runtimes.getRuntimeIdWithScriptId(__current_script.script_id) == msg.id )
    {
      __clearView();
    }
  }

  this.ondestroy = function()
  {
    // keep any state about the script currently displayed
    __view_is_destroyed = true;
  }


  /* action broker interface */

  /**
    * To handle a single action.
    * Returning false (as in === false) will cancel the event
    * (preventDefault and stopPropagation),
    * true will pass it to the next level if any.
    * @param {String} action_id
    * @param {Event} event
    * @param {Element} target
    */
  this.handle = function(action_id, event, target){};

  /**
    * To get a list of supported actions.
    */
  this.get_action_list = function(){};

  /**
    * Gets called if an action handler changes to be the current context.
    */
  this.focus = function(container){};

  /**
    * Gets called if an action handle stops to be the current context.
    */
  this.blur = function(){};

  /**
    * Gets called if an action handler is the current context.
    * Returning false (as in === false) will cancel the event
    * (preventDefault and stopPropagation),
    * true will pass it to the next level if any.
    */
  this.onclick = function(event){};

  this.handle = function(action_id, event, target)
  {
    if (action_id in this._handlers)
      return this._handlers[action_id](event, target);
  }

  this.get_action_list = function()
  {
    var actions = [], key = '';
    for (key in this._handlers)
      actions.push(key);
    return actions;
  };

  this.mode = "default";

  this._handlers = {};

  this.mode_labels =
  {
    "default": ui_strings.S_LABEL_KEYBOARDCONFIG_MODE_DEFAULT,
  }

  const PAGE_SCROLL = 20;
  const ARROW_SCROLL = 2;
  /*
    this.showLine = function(script_id,
                           line_nr,
                           clear_scroll,
                           is_parse_error,
                           update_scroll_height,
                           keep_line_highlight)
                           */
  this._scroll_lines = function(lines, event, target)
  {
    if (__current_script && __current_script.line_arr)
    {
      var target_line = Math.max(1, Math.min(__current_line + lines,
                                             __current_script.line_arr.length + 1));
      if (__current_line != target_line)
      {
        __disregard_scroll_event = true;
        document.getElementById(scroll_container_id).scrollTop =
          (target_line - 1) * context['line-height'];
        this.showLine(__current_script.script_id, target_line, null, null, false);
      }
    }
    return false;
  }

  this._onbreakpointupdated = function(msg)
  {
    if (__current_script && __current_script.script_id == msg.script_id)
    {
      updateBreakpoints();
    }
  };

  this._onmonospacefontchange = function(msg)
  {
    this._set_style();
    if (this.isvisible() && __container)
    {
      __view_is_destroyed = true;
      this.createView(__container);
    }
  };

  eventHandlers.mousewheel['scroll-js-source-view'] = function(event, target)
  {
    this._scroll_lines((event.detail > 0 ? 1 : -1) * 3 , event, target);
  }.bind(this);

  this._handlers['show-window-go-to-line'] = function(event, target)
  {
    UIWindowBase.showWindow(this._go_to_line.id,
                            this._go_to_line.window_top,
                            this._go_to_line.window_left,
                            this._go_to_line.window_width,
                            this._go_to_line.window_height);
    return false;
  }.bind(this);

  this._handlers['scroll-page-up'] = this._scroll_lines.bind(this, -PAGE_SCROLL);
  this._handlers['scroll-page-down'] = this._scroll_lines.bind(this, PAGE_SCROLL);
  this._handlers['scroll-arrow-up'] = this._scroll_lines.bind(this, -ARROW_SCROLL);
  this._handlers['scroll-arrow-down'] = this._scroll_lines.bind(this, ARROW_SCROLL);
  this.init(id, name, container_class, null, 'scroll-js-source-view');
  this._go_to_line = new cls.GoToLine(this);
  messages.addListener('update-layout', updateLayout);
  messages.addListener('runtime-destroyed', onRuntimeDestroyed);
  messages.addListener('breakpoint-updated', this._onbreakpointupdated.bind(this));
  messages.addListener('monospace-font-changed',
                       this._onmonospacefontchange.bind(this));

  ActionBroker.get_instance().register_handler(this);
}

cls.JsSourceView.prototype = ViewBase;

cls.GoToLine = function(js_source_view)
{
  this.window_top = 80;
  this.window_left = 80;
  this.window_width = 100;
  this.window_height = 45;
  this.window_resizable = false;
  this.window_statusbar = false;

  ActionHandlerInterface.apply(this);

  this._handlers['submit'] = function(event, target)
  {
    var value = event.target.value.trim();
    UIWindowBase.closeWindow(this.id);
    var script_id = this._js_source_view.getCurrentScriptId();
    if (script_id && value.isdigit())
    {
      this._js_source_view.show_and_flash_line(script_id, parseInt(value));
      // workaround to reset the focus to the js source view
      // needs a proper design
      this._js_source_view.get_container().dispatchMouseEvent('click');
    }
  }.bind(this);

  this.createView = function(container)
  {
    container.clearAndRender(['input', 'class', 'go-to-line-input']).focus();
  };

  this._js_source_view = js_source_view;
  this.init('go-to-line', ui_strings.M_VIEW_LABEL_GO_TO_LINE, 'go-to-line');

  ActionBroker.get_instance().register_handler(this);

};

cls.GoToLine.prototype = ViewBase;

cls.ScriptSelect = function(id, class_name)
{

  var selected_value = "";
  var selected_script_id = 0;

  var stopped_script_id = '';

  this.getSelectedOptionText = function()
  {
    selected_script_id = runtimes.getSelectedScript();
    if (selected_script_id)
    {
      var script = runtimes.getScript(selected_script_id);
      if (script)
      {
        var display_uri = helpers.shortenURI(script.uri);
        var script_type = script.script_type.capitalize(true);
        return display_uri.uri ?
               display_uri.uri :
               script_type + " – " + (script.script_data.replace(/\s+/g, " ").slice(0, 300) ||
               ui_strings.S_TEXT_ECMA_SCRIPT_SCRIPT_ID + ': ' + script.script_id);
      }
      else
      {
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
          'missing script in getSelectedOptionText in cls.ScriptSelect');
      }
    }
    else if(runtimes.getSelectedRuntimeId() &&
            runtimes.isReloadedWindow(runtimes.getActiveWindowId()))
    {
      return ui_strings.S_INFO_RUNTIME_HAS_NO_SCRIPTS;
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

      for( ; ( rt = _runtimes[i] ) && !rt['selected']; i++);
      if( !rt && _runtimes[0] )
      {
        opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE + 'no runtime selected')
        return;
      }
      return templates.script_dropdown(_runtimes,
                                 stopped_script_id,
                                 runtimes.getSelectedScript());
    }
  }

  this.checkChange = function(target_ele)
  {
    var script_id = parseInt(target_ele.get_attr('parent-node-chain', 'script-id'));

    if(script_id)
    {
      // TODO is this needed?
      if(script_id != selected_script_id)
      {
        runtimes.setSelectedScript(script_id);
        topCell.showView(views.js_source.id);
        selected_script_id = script_id;
      }
    }
    else
    {
      opera.postError(ui_strings.S_DRAGONFLY_INFO_MESSAGE +
        "missing script id in handlers['display-script']")
    }
    selected_value = target_ele.textContent;
    // TODO

    return true;
  }

  // this.updateElement

  var onThreadStopped = function(msg)
  {
    stopped_script_id = msg.stop_at.script_id;
  }

  var onThreadContinue = function(msg)
  {
    stopped_script_id = '';
  }

  var onApplicationSetup = function()
  {
    eventHandlers.change['set-tab-size']({target: {value:  settings.js_source.get('tab-size')}});
  }

  messages.addListener("thread-stopped-event", onThreadStopped);
  messages.addListener("thread-continue-event", onThreadContinue);
  messages.addListener("application-setup", onApplicationSetup);


  this.init(id, class_name);
}

cls.ScriptSelect.prototype = new CstSelect();


cls.JsSourceView.create_ui_widgets = function()
{
  var major_ecma_service_version = parseInt(window.services['ecmascript-debugger'].version.split('.')[0]);
  var toolbar_buttons =
  [
    {
      handler: 'continue',
      rawtitle: ui_strings.S_BUTTON_LABEL_CONTINUE,
      id: 'continue-run',
      disabled: true
    },
    {
      handler: 'continue',
      rawtitle: ui_strings.S_BUTTON_LABEL_STEP_INTO,
      id: 'continue-step-into-call',
      disabled: true
    },
    {
      handler: 'continue',
      rawtitle: ui_strings.S_BUTTON_LABEL_STEP_OVER,
      id: 'continue-step-next-line',
      disabled: true
    },
    {
      handler: 'continue',
      rawtitle: ui_strings.S_BUTTON_LABEL_STEP_OUT,
      id: 'continue-step-out-of-call',
      disabled: true
    }
  ];

  var set_shortcuts = function()
  {
    var broker = ActionBroker.get_instance();
    var global_handler = ActionBroker.GLOBAL_HANDLER_ID;
    toolbar_buttons.forEach(function(button)
    {
      if (button.rawtitle)
      {
        var shortcut = broker.get_shortcut_with_handler_and_action(global_handler,
                                                                   button.id);
        shortcut = window.helpers.capitalize_first_char(shortcut);
        button.title = button.rawtitle.replace("%s", shortcut);
      }
    });
  };

  new ToolbarConfig
  (
    'js_source',
    toolbar_buttons,
    null,
    /*
    [
      {
        handler: 'js-source-text-search',
        shortcuts: 'js-source-text-search',
        title: ui_strings.S_INPUT_DEFAULT_TEXT_SEARCH,
        label: ui_strings.S_INPUT_DEFAULT_TEXT_SEARCH
      }
    ],*/
    null,
    [
      {
        handler: 'select-window',
        title: ui_strings.S_BUTTON_LABEL_SELECT_WINDOW,
        type: 'dropdown',
        class: 'window-select-dropdown',
        template: window['cst-selects']["js-script-select"].getTemplate()
      }
    ],
    true
  );

  new Settings
  (
    // id
    'js_source',
    // key-value map
    {
      script: 0,
      exception: 0,
      error: 0,
      abort: 0,
      'tab-size': 4
    },
    // key-label map
    {
      script: ui_strings.S_BUTTON_LABEL_STOP_AT_THREAD,
      exception: ui_strings.S_BUTTON_LABEL_AT_EXCEPTION,
      error: ui_strings.S_BUTTON_LABEL_AT_ERROR,
      abort: ui_strings.S_BUTTON_LABEL_AT_ABORT,
      'tab-size': ui_strings.S_LABEL_TAB_SIZE
    },
    // settings map
    {
      checkboxes:
      [
        'script',
        'exception',
        'error',
        'abort'
      ],
      customSettings:
      [
        'hr',
        'tab-size'
      ],
      contextmenu:
      [
        'error'
      ]
    },
    // custom templates
    {
      'hr':
      function(setting)
      {
        return ['hr'];
      },
      'tab-size':
      function(setting)
      {
        return (
        [
          'setting-composite',
          ['label',
            setting.label_map['tab-size'] + ': ',
            ['input',
              'type', 'number',
              'handler', 'set-tab-size',
              'max', '8',
              'min', '0',
              'value', setting.get('tab-size')
            ]
          ]
        ] );
      }
    },
    "script"
  );

  new Switches
  (
    'js_source',
    [
      'script',
      'error'
    ]
  );


  new JSSourceSearch('js_source',
                     [Searchbar, VirtualTextSearch],
                     [cls.JSSearchWindow]);

  eventHandlers.click['show-script'] = function(event, target)
  {
    this.broker.dispatch_action("js_source-search-window", "show-script", event, target);
  };

  eventHandlers.change['set-tab-size'] = function(event, target)
  {
    var
    style = document.styleSheets.getDeclaration("#js-source-content div"),
    tab_size = event.target.value;

    if(style && /[0-8]/.test(tab_size))
    {
      style.setProperty('-o-tab-size', tab_size, 0);
      settings.js_source.set('tab-size', tab_size);
    }
  }

  eventHandlers.click['show-event-breakpoint-view'] = function(event, target)
  {
    var view = window.views['event-breakpoints'];
    UIWindowBase.showWindow(view.id,
                            view.window_top,
                            view.window_left,
                            view.window_width,
                            window.innerHeight >= view.window_height + 80 ?
                            view.window_height :
                            window.innerHeight - 80);
  }

  window.messages.addListener('shortcuts-changed', set_shortcuts);
  set_shortcuts();

  var broker = ActionBroker.get_instance();
  var contextmenu = ContextMenu.get_instance();
  var breakpoints = cls.Breakpoints.get_instance();

  contextmenu.register("js_source", [
    {
      callback: function(event, target)
      {
        var line = parseInt(event.target.get_attr("parent-node-chain", 
                                                  "data-line-number"));
        var script_id = views.js_source.getCurrentScriptId();
        var bp_view = window.views.breakpoints;
        var items = [];

        if (!line)
        {
          var input = event.target.parentNode.firstElementChild;
          line = input && parseInt(input.value);
        }
        if (line)
        {
          var selection = window.getSelection();
          if (!selection.isCollapsed)
          {
            var key = selection.toString();
            items.push({
              label: ui_strings.M_CONTEXTMENU_ADD_WATCH.replace("%s", key),
              handler: function(event, target) {
                window.views.watches.add_watch(key);
              }
            });
          }

          var bp = breakpoints.get_breakpoint_on_script_line(script_id, line);
          if (bp)
          {
            if (bp.is_enabled)
            {
              items.push({
                label: !bp.condition ?
                       ui_strings.M_CONTEXTMENU_ADD_CONDITION :
                       ui_strings.M_CONTEXTMENU_EDIT_CONDITION,
                handler: bp_view.show_and_edit_condition.bind(bp_view, script_id, line)
              },
              {
                label: ui_strings.M_CONTEXTMENU_DELETE_CONDITION,
                handler: function(event, target) {
                  breakpoints.set_condition("", bp.id);
                },
                disabled: !bp.condition
              },
              {
                label: ui_strings.M_CONTEXTMENU_REMOVE_BREAKPOINT,
                handler: function(event, target) {
                  breakpoints.remove_breakpoint(script_id, line);
                }
              },
              {
                label: ui_strings.M_CONTEXTMENU_DELETE_BREAKPOINT,
                handler: function(event, target) {
                  var bp_id = breakpoints.remove_breakpoint(script_id, line);
                  breakpoints.delete_breakpoint(bp_id);
                }
              });
            }
            else
            {
              items.push({
                label: ui_strings.M_CONTEXTMENU_ENABLE_BREAKPOINT,
                handler: function(event, target) {
                  breakpoints.add_breakpoint(script_id, line);
                }
              });
            }
          }
          else
          {
            items.push({
              label: ui_strings.M_CONTEXTMENU_ADD_BREAKPOINT,
              handler: function(event, target) {
                breakpoints.add_breakpoint(script_id, line);
              }
            });
          }
          return items;
        }
      }
    }
  ], true); // extend the default existing menu
};
