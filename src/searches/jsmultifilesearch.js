var JSMultifileSearch = function()
{
  this._init();

};

var JSMultifileSearchPrototype = function()
{
  this._get_match_counts = TextSearch.prototype._get_match_counts;
  this._get_search_cursor = TextSearch.prototype._get_search_cursor;
  this._highlight_next = TextSearch.prototype.highlight_next;
  this._highlight_previous = TextSearch.prototype.highlight_previous;

  const 
  JS_SOURCE_ID = 'js_source',
  ALL_FILES = 1,
  SINGLE_FILE = 0,
  NO_MATCH = TextSearch.NO_MATCH,
  EMPTY = TextSearch.EMPTY,
  // duplicated code domsearch
  MATCH_NODE_HIGHLIGHT_CLASS = "dom-search-match-cursor";

  this.set_form_input = function(input)
  {
    if(input)
    {
      this._input = input;
    }
  };

  this.highlight_previous = function()
  {
    if (this._validate_current_search())
    {
      this._highlight_previous();
    }
  };

  this.highlight_next = function()
  {
    if (this._validate_current_search())
    {
      this._highlight_next();
    }
  };

  this.update_search = function()
  {    
    this._validate_current_search();
  };

  this.show_last_search = function()
  {
    if (typeof this._last_query == 'string')
    {
      this._input.value = this._last_query;
    }
    this._show_search_results();
  };

  // duplicated code domsearch
  this._onhighlightstyle = function(span_list)
  {
    if (span_list.length)
    {
      var target = span_list[0].get_ancestor('.js-search-match');
      if (this._highligh_node && this._highligh_node != target)
      {
        this._highligh_node.removeClass(MATCH_NODE_HIGHLIGHT_CLASS)
      }
      if (target)
      {
        this._highligh_node = target;
        this._highligh_node.addClass(MATCH_NODE_HIGHLIGHT_CLASS);
      }
    }
  };

  this._on_active_tab = function(msg)
  {
    this._rt_ids = msg.activeTab.slice(0);
    this._search_term = '';
  };

  this._show_search_results = function()
  {
    this._create_search_results_view();
    this.highlight_next();
  };

  this._create_search_results_view = function()
  {
    if (this._container)
    {
      this._clear_hits();
      this._container.firstElementChild.innerHTML = "";
      if (this.search_all_files)
      {
        var tmpl = window.templates.js_search_results(this.searchresults);
        this._container.firstElementChild.render(tmpl);
        // .js-search-results-runtime
        //   .js-search-results-script
        //     div (for each line)
        var rts = this._container.getElementsByClassName('js-search-results-runtime');
        var rt_index = 0;
        var script_eles = null, script_ele = null, i = 0;
        for (var rt_id in this.searchresults)
        {
          script_eles = rts[rt_index++].getElementsByClassName('js-search-results-script');
          for (i = 0; script_ele = script_eles[i]; i++)
          {
            this._set_hits(this.searchresults[rt_id][i], script_ele);
          }
        }
      }
      else if(this._script)
      {
        var tmpl = window.templates.search_result_script(this._script, false);
        var script_ele = this._container.firstElementChild.render(tmpl);
        this._set_hits(this._script, script_ele);
      }
    }
  };

  this._set_hits = function(script, script_ele)
  {
    var line_eles = script_ele.getElementsByTagName('code');
    var cur_line_no = 0;
    var line_no = 0;
    var line_ele = null;
    var line_ele_index = 0;
    for (var i = 0; i < script.line_matches.length; i++)
    {
      cur_line = script.line_matches[i];
      if (cur_line != line_no)
      {
        line_no = cur_line;
        line_ele = line_eles[line_ele_index++];
      }
      this.set_hit(line_ele, script.line_offsets[i], script.match_length);
    }
  };

  this._validate_current_search = function()
  {
    if (this._input.value != this._last_query ||
        this.search_type != this._last_search_type ||
        this.ignore_case != this._last_ignore_case ||
        this.search_all_files != this._last_search_all_files ||
        this._script != this._last_script)
    {
      this._last_query = this._input.value;
      this._orig_search_term = this._last_query;
      this._last_search_type = this.search_type;
      this._last_ignore_case = this.ignore_case;
      this._last_search_all_files = this.search_all_files;
      this._last_script = this._script;
      this._match_cursor = -1;
      this.searchresults = {};
      this.reset_match_cursor();
      var tmpl = ['div', 'searching …', 'class', 'info-is-searching'];
      this._container.firstElementChild.clearAndRender(tmpl);
      if (this._last_query)
      {
        if (this.search_all_files)
        {
          if (this._rt_ids)
          {
            this._rt_ids.forEach(function(rt_id)
            {
              var scripts = window.runtimes.getScripts(rt_id).filter(function(script)
              {
                script.search_source(this._last_query);
                return script.line_matches.length;
              }, this);
              if (scripts.length)
              {
                this.searchresults[rt_id] = scripts;
              }
            }, this);
          }
        }
        else 
        {
          if (this._script)
          {
            this._script.search_source(this._last_query);
          }
        }
      }
      setTimeout(this._show_search_results_bound, 5);
      return false;
    }
    return true;
  };

  this._update_match_highlight = function(event, target)
  {
    var line = event.target.get_ancestor('.js-search-match');
    if (line)
    {
      var matches = line.getElementsByTagName('em');
      var ev_left = event.clientX;
      var ev_top = event.clientY;
      var min_dist = Infinity;
      var match = null;
      for (var i = 0, cur, box, d, dx, dy; cur = matches[i]; i++)
      {
        box = cur.getBoundingClientRect();
        dx = ev_left < box.left ?
             box.left - ev_left :
             ev_left > box.right ?
             ev_left - box.right :
             0;
        dy = ev_top < box.top ?
             box.top - ev_top :
             ev_top > box.bottom ?
             ev_top - box.bottom :
             0;
        dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
        if (dist < min_dist)
        {
          min_dist = dist;
          match = cur;
        }
      }
      if (match)
      {
        this.set_match_cursor(match);
        this._update_info();
      }
    }
  };

  this._show_script = function(event, target)
  {
    this._update_match_highlight(event, target);
    this.show_script_of_search_match(event, target)
  };

  this._super_init = this._init;

  this._init = function()
  {
    this._super_init();
    this._rt_ids = null;
    this._last_search_type = undefined;
    this._last_ignore_case = undefined;
    this._last_search_all_files = undefined;
    this._source_file_hit = null;
    this.search_type = undefined;
    this.ignore_case = undefined;
    this.search_all_files = undefined;
    this._show_search_results_bound = this._show_search_results.bind(this);
    window.eventHandlers.click['show-script'] = this._show_script.bind(this);
    window.eventHandlers.mouseover['show-script'] =
      this.clear_style_highlight_node.bind(this);
    window.messages.addListener('active-tab', this._on_active_tab.bind(this));
  };

  this.clear_style_highlight_node = function()
  {
    if (this._highligh_node)
    {
      this._highligh_node.removeClass(MATCH_NODE_HIGHLIGHT_CLASS);
      this._highligh_node = null;
    }
  };

  this.show_script_of_search_match = function(event, target)
  {
    var cursor = this.get_match_cursor();
    var script = null, i = 0;
    if (this.search_all_files)
    {
      for (var rt_id in this.searchresults)
      {
        for (i = 0; script = this.searchresults[rt_id][i]; i++)
        {
          if (cursor < script.line_matches.length)
          {
            break;
          }
          else
          {
            cursor -= script.line_matches.length;
          }
        }
        if (script)
        {
          break;
        }
      }
    }
    else
    {
      script = this._script;
    }
    if (script)
    {
      var js_source_view = window.views[JS_SOURCE_ID];
      var line_nr = script.line_matches[cursor];
      js_source_view.showLine(script.script_id, line_nr - 10);
      this._last_script = this._script;
      var line_ele = js_source_view.get_line_element(line_nr);
      if (this._source_file_hit)
      {
        this._clear_highlight_spans(this._source_file_hit);
      }
      this._source_file_hit = this.set_hit(line_ele, 
                                           script.line_offsets[cursor],
                                           script.match_length,
                                           this._match_style_highlight,
                                           false);
      var target = this._source_file_hit && this._source_file_hit[0];
      if (target)
      {
        var scroll_container = js_source_view.get_scroll_container();
        scroll_container.scrollLeft = 0;
        if (target.offsetLeft + target.offsetWidth > scroll_container.offsetWidth)
        {
          scroll_container.scrollLeft = target.offsetLeft - 
                                        scroll_container.offsetWidth +
                                        target.offsetWidth + 100;
        }
      }
    }
  };

  
  this.reset_match_cursor = function()
  {
    this._match_cursor = -1;
    this._hits = [];
    this._hit = null;
  };
  
  this.set_match_cursor = function(target)
  {
    var hit = null;
    for (var i = 0, hit = null; hit = this._hits[i]; i++)
    {
      if (hit.indexOf(target) != -1)
      {
        this._hits[this._match_cursor].forEach(this._set_default_style, this);
        this._match_cursor = i;
        this._hits[this._match_cursor].forEach(this._set_highlight_style, this);
        break;
      }
    }
  };

  this.get_match_cursor = function()
  {
    return this._match_cursor;
  };

};

JSMultifileSearchPrototype.prototype = VirtualTextSearch.prototype;
JSMultifileSearch.prototype = new JSMultifileSearchPrototype();
