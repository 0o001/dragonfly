window.cls || (window.cls = {});

cls.JSSourceTooltip = function(view)
{

  const POLL_INTERVAL = 150;
  const MAX = Math.max;
  const MIN = Math.min;
  const POW = Math.pow;
  const MIN_RADIUS = 2;

  var _tooltip = null;
  var _view = null;
  var _poll_interval = 0;
  var _tooltip_target_ele = null;
  var _last_move_event = null;
  var _is_token_selected = false;
  var _mouse_positions = [];
  var _container = null;
  var _container_box = null;
  var _char_width = 0;
  var _line_height = 0;
  var _default_offset = 10;
  var _total_y_offset = 0;

  // TODO reset char-width and line-height on the according evemnt

  var _onmousemove = function(event)
  {
    _last_move_event = event;
  };

  var _get_mouse_pos_center = function()
  {
    var center = null;
    if (_mouse_positions.length > 2)
    {
      var min_x = MIN(_mouse_positions[0].x,
                      _mouse_positions[1].x,
                      _mouse_positions[2].x);
      var max_x = MAX(_mouse_positions[0].x,
                      _mouse_positions[1].x,
                      _mouse_positions[2].x);
      var min_y = MIN(_mouse_positions[0].y,
                      _mouse_positions[1].y,
                      _mouse_positions[2].y);
      var max_y = MAX(_mouse_positions[0].y,
                      _mouse_positions[1].y,
                      _mouse_positions[2].y);
      var dx = max_x - min_x;
      var dy = max_y - min_y;

      center = {x: min_x + dx / 2,
                y: min_y + dy / 2,
                r: POW(POW(dx / 2, 2) + POW(dy / 2, 2), 0.5)};
    }

    return center;
  };

  var c = 0;

  var _poll_position = function()
  {
    if (_is_token_selected)
    {
      
    }
    else if (_last_move_event)
    {
      while (_mouse_positions.length > 2)
        _mouse_positions.shift();

      _mouse_positions.push({x: _last_move_event.clientX,
                             y: _last_move_event.clientY});
      
      var center = _get_mouse_pos_center();

      if (center && center.r <= MIN_RADIUS)
      {
        var script = _view.get_current_script();
        if (script)
        {
          var offset_y = center.y - _container_box.top;
          var line_number = _view.get_line_number_with_offset(offset_y);
          var line = script.get_line(line_number);
          var offset_x = center.x + _container.scrollLeft - _total_y_offset;
          var char_offset = get_char_offset(line, offset_x);

          _view.show_and_flash_line(script.script_id, line_number);
          opera.postError(/*line +', '+*/offset_x +', '+char_offset +', '+line[char_offset]);
          
        }
        /*
        _tooltip.show("test " + (c++), {left: center.x,
                                        top: center.y,
                                        right: center.x,
                                        bottom: center.y});
        */
      }
      else
      {
        _tooltip.hide();
      }
    }
  };

  var _get_tab_size = function()
  {
    var style_dec = document.styleSheets.getDeclaration("#js-source-content div");
    return style_dec ? parseInt(style_dec.getPropertyValue("-o-tab-size")) : 0;
  };

  var get_char_offset = function(line, offset)
  {
    offset /= _char_width;
    for (var i = 0, l = line.length, offset_count = 0; i < l; i++)
    {
      offset_count += line[i] == "\t"
                     ? _tab_size - (offset_count % _tab_size)
                     : 1;
      if (offset_count > offset)
        return i;
    }

    return -1;
  };

  var _ontooltip = function(event, target)
  {
    if (!_poll_interval)
    {
      if (!_char_width)
      {
        _char_width = defaults["js-source-char-width"];
        _line_height = defaults["js-source-line-height"];
        _tab_size = _get_tab_size();
        _default_offset = defaults["js-default-text-offset"];
        // TODO reset on the according event
      }

      var container = _view.get_scroll_container();
      if (container)
      {
        // TODO resize events
        _container = container;
        _container_box = container.getBoundingClientRect();
        _tooltip_target_ele = target;
        _tooltip_target_ele.addEventListener('mousemove', _onmousemove, false);
        while (_mouse_positions.length)
          _mouse_positions.pop();
        _total_y_offset = _container_box.left + _default_offset;
        _poll_interval = setInterval(_poll_position, POLL_INTERVAL);
      }
    }    
  };

  var _onhide = function()
  {
    if (_poll_interval)
    {
      clearInterval(_poll_interval);
      _tooltip_target_ele.removeEventListener('mousemove', _onmousemove, false);
      _poll_interval = 0;
      _tooltip_target_ele = null;
      _container_box = null;
      _container = null;
    }
  };

  var _ontooltipenter = function(event)
  {
    
  };

  var _ontooltipleave = function(event)
  {
    
  };

  var _init = function(view)
  {
    _view = view;
    _tooltip = Tooltips.register(cls.JSSourceTooltip.tooltip_name, true);
    _tooltip.ontooltip = _ontooltip;
    _tooltip.onhide = _onhide;
    _tooltip.ontooltipenter = _ontooltipenter;
    _tooltip.ontooltipleave = _ontooltipleave;
    
  };

  _init(view);
};

cls.JSSourceTooltip.tooltip_name = "js-source";



