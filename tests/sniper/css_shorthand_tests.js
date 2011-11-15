addModule("CSS shorthands");

setServiceRequirements({
  "scope": "1.0-",
  "ecmascript-debugger": "",
  "window-manager": ""
});

var set_properties = function(props)
{
  for (var prop in props)
  {
    var value = props[prop];
    var priority = "";
    if (value.indexOf("!important") != -1)
    {
      value = value.replace("!important", "");
      priority = "important";
    }
    evalBasic("document.body.style.setProperty('" +
                prop + "', '" +
                value.replace(/'/g, "\\'") +  "', '" +
                priority +
              "');");
  }
};

var remove_properties = function(props)
{
  props.forEach(function(prop) {
    evalBasic("document.body.style.removeProperty('" + prop + "')");
  });
};

var clear_properties = function()
{
    evalBasic("document.body.style.cssText = '';");
};

var Rule = function(rule)
{
  this.declarations = [];

  for (var i = 0, len = rule.indexList.length; i < len; i++)
  {
    this.declarations.push({
      property: window.css_index_map.nameList[rule.indexList[i]],
      value: rule.valueList[i],
      priority: rule.priorityList[i]
      //is_applied: true,
      //is_disabled: false
    });
  }
};

var fix_rule = function(rule)
{
  var new_rule = {declarations: []};
  for (var i = 0, len = rule.properties.length; i < len; i++)
  {
    new_rule.declarations[i] = {
      property: rule.properties[i],
      value: rule.values[i],
      priority: rule.priorities ? rule.priorities[i] : false
    };
  }
  return new_rule;
};

var assert_rule = function(expected)
{
  var css_decl = ecmascript_debugger.CssGetStyleDeclarations({
    runtimeID: window.rt_id,
    objectID: window.body_el_id
  });

  var rule = new Rule(css_decl.nodeStyleList[0].styleList[0]);
  CssShorthandResolver.get_instance().resolve(rule.declarations);

  assertEquals(JSON.stringify(rule.declarations), JSON.stringify(fix_rule(expected).declarations));
};

addTest("Resolving CSS shorthands", function () {
  window.css_index_map = ecmascript_debugger.CssGetIndexMap();

  const html = [
    "<!doctype html><title>shorthands</title><p>"
  ];

  openURLWithConfig(dataURL(html), loadURLUntilRuntimeLoaded, STOP_DISABLED);

  window.rt_id = getCurrentRuntimeID();
  window.body_el_id = evalObjectID("document.body");

  set_properties(
    {
      "margin": "1px",
    }
  );

  assert_rule(
    {
      properties: [
        "margin",
      ],
      values: [
        "1px",
      ]
    }
  );

  set_properties(
    {
      "margin-right": "2px",
    }
  );

  assert_rule(
    {
      properties: [
        "margin",
      ],
      values: [
        "1px 2px 1px 1px",
      ]
    }
  );

  set_properties(
    {
      "margin-left": "2px",
    }
  );

  assert_rule(
    {
      properties: [
        "margin",
      ],
      values: [
        "1px 2px",
      ]
    }
  );

  clear_properties();

  set_properties(
    {
      "margin-top": "1px",
      "margin-bottom": "1px",
    }
  );

  assert_rule(
    {
      properties: [
        "margin-top",
        "margin-bottom",
      ],
      values: [
        "1px",
        "1px",
      ]
    }
  );

  clear_properties();

  set_properties(
    {
      "padding": "1px",
    }
  );

  assert_rule(
    {
      properties: [
        "padding",
      ],
      values: [
        "1px",
      ]
    }
  );

  set_properties(
    {
      "padding-right": "2px",
    }
  );

  assert_rule(
    {
      properties: [
        "padding",
      ],
      values: [
        "1px 2px 1px 1px",
      ]
    }
  );

  set_properties(
    {
      "padding-left": "2px",
    }
  );

  assert_rule(
    {
      properties: [
        "padding",
      ],
      values: [
        "1px 2px",
      ]
    }
  );

  clear_properties();

  set_properties(
    {
      "padding-top": "1px",
      "padding-bottom": "1px",
    }
  );

  assert_rule(
    {
      properties: [
        "padding-top",
        "padding-bottom",
      ],
      values: [
        "1px",
        "1px",
      ]
    }
  );

  clear_properties();

  set_properties(
    {
      "border": "1px solid red",
      "border-top": "1px solid red",
      "border-bottom-width": "1px",
    }
  );

  assert_rule(
    {
      properties: [
        "border",
      ],
      values: [
        "1px solid rgb(255, 0, 0)",
      ]
    }
  );

  set_properties(
    {
      "border-top-width": "2px",
    }
  );

  assert_rule(
    {
      properties: [
        "border-top",
        "border-left",
        "border-right",
        "border-bottom",
      ],
      values: [
        "2px solid rgb(255, 0, 0)",
        "1px solid rgb(255, 0, 0)",
        "1px solid rgb(255, 0, 0)",
        "1px solid rgb(255, 0, 0)",
      ]
    }
  );

  remove_properties(["border-left-style"]);

  assert_rule(
    {
      properties: [
        "border-left-color",
        "border-left-width",
        "border-top",
        "border-right",
        "border-bottom",
      ],
      values: [
        "rgb(255, 0, 0)",
        "1px",
        "2px solid rgb(255, 0, 0)",
        "1px solid rgb(255, 0, 0)",
        "1px solid rgb(255, 0, 0)",
      ]
    }
  );

  clear_properties();

  set_properties({"border-style": "solid"});

  assert_rule(
    {
      properties: [
        "border-top-style",
        "border-right-style",
        "border-bottom-style",
        "border-left-style",
      ],
      values: [
        "solid",
        "solid",
        "solid",
        "solid",
      ]
    }
  );

  clear_properties();

  set_properties({"list-style": "circle"});

  assert_rule(
    {
      properties: [
        "list-style",
      ],
      values: [
        "circle outside none",
      ]
    }
  );

  remove_properties(["list-style-type"]);

  assert_rule(
    {
      properties: [
        "list-style-position",
        "list-style-image",
      ],
      values: [
        "outside",
        "none",
      ]
    }
  );

  clear_properties();

  set_properties({"outline": "1px"});

  assert_rule(
    {
      properties: [
        "outline",
      ],
      values: [
        "1px none invert",
      ]
    }
  );

  remove_properties(["outline-width"]);

  assert_rule(
    {
      properties: [
        "outline-style",
        "outline-color",
      ],
      values: [
        "none",
        "invert",
      ]
    }
  );

  clear_properties();

  set_properties({"overflow-x": "auto", "overflow-y": "auto"});

  assert_rule(
    {
      properties: [
        "overflow",
      ],
      values: [
        "auto",
      ]
    }
  );

  set_properties({"overflow-y": "hidden"});

  assert_rule(
    {
      properties: [
        "overflow",
      ],
      values: [
        "auto hidden",
      ]
    }
  );

  clear_properties();

  set_properties({"font": "12px sans-serif"});

  assert_rule(
    {
      properties: [
        "font",
      ],
      values: [
        "normal normal 400 12px/normal sans-serif",
      ]
    }
  );

  clear_properties();

  set_properties({"background": "red"});

  assert_rule(
    {
      properties: [
        "background",
      ],
      values: [
        "none 0% 0%/auto repeat scroll padding-box border-box rgb(255, 0, 0)",
      ]
    }
  );

  clear_properties();

  set_properties({"background": "none, red"});

  assert_rule(
    {
      properties: [
        "background",
      ],
      values: [
        "none 0% 0%/auto repeat scroll padding-box border-box, none 0% 0%/auto repeat scroll padding-box border-box rgb(255, 0, 0)",
      ]
    }
  );

  clear_properties();

  set_properties({
    "background-attachment": "scroll, scroll",
    "background-repeat": "repeat, repeat",
    "background-image": "url(\",\"), none",
    "background-position": "0% 0%, 0% 0%",
    "background-size": "auto, auto",
    "background-origin": "padding-box, padding-box",
    "background-clip": "border-box, border-box",
    "background-color": "rgb(255, 0, 0)",
  });

  assert_rule(
    {
      properties: [
        "background",
      ],
      values: [
        "url(\",\") 0% 0%/auto repeat scroll padding-box border-box, none 0% 0%/auto repeat scroll padding-box border-box rgb(255, 0, 0)",
      ]
    }
  );

  clear_properties();

  set_properties({"-o-transition": "1s"});

  assert_rule(
    {
      properties: [
        "-o-transition",
      ],
      values: [
        "all 1s cubic-bezier(0.25, 0.1, 0.25, 1) 0",
      ]
    }
  );

  clear_properties();

  set_properties({"-o-transition": "color 1s, opacity 2s"});

  assert_rule(
    {
      properties: [
        "-o-transition",
      ],
      values: [
        "color 1s cubic-bezier(0.25, 0.1, 0.25, 1) 0, opacity 2s cubic-bezier(0.25, 0.1, 0.25, 1) 0",
      ]
    }
  );

  clear_properties();

  set_properties({"columns": "100px 3"});

  assert_rule(
    {
      properties: [
        "columns",
      ],
      values: [
        "100px 3",
      ]
    }
  );

  clear_properties();

  set_properties({"column-rule": "1px solid red"});

  assert_rule(
    {
      properties: [
        "column-rule",
      ],
      values: [
        "1px solid rgb(255, 0, 0)",
      ]
    }
  );

  clear_properties();

  set_properties(
    {
      "margin": "1px",
      "margin-top": "1px !important",
    }
  );

  assert_rule(
    {
      properties: [
        "margin-right",
        "margin-bottom",
        "margin-left",
        "margin-top",
      ],
      values: [
        "1px",
        "1px",
        "1px",
        "1px",
      ],
      priorities: [
        false,
        false,
        false,
        true,
      ]
    }
  );

  set_properties(
    {
      "margin": "1px !important",
    }
  );

  assert_rule(
    {
      properties: [
        "margin",
      ],
      values: [
        "1px",
      ],
      priorities: [
        true,
      ]
    }
  );
});


