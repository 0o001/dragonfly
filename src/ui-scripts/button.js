﻿/**
 * @constructor
 */
var ButtonBase = function()
{
  this.type = "button";

  this.init = function(id, class_name, title, handler, attributes)
  {
    this.id = id;
    this.class_name = class_name || '';
    this.title = title || '';
    this.handler = handler || '';
    this.attributes = attributes || {};
  };
};

var Button = function(id, class_name, title, handler, attributes)
{
  /** interface **/

  /**
   * Set the active state of the button.
   *
   * @param {Boolean} active Whether or not the button is active.
   */
  this.set_active = function(active) {};

  /**
   * Get the button template.
   */
  this.get_template = function() {};


  /** implementation **/

  this.set_active = function(active)
  {
    !!active ? this._element.addClass("is-active") : this._element.removeClass("is-active");
  };

  this.get_template = function()
  {
    return window.templates[this.type](this.id, this.class_name, this.title, this.handler, this.attributes);
  };

  this.init(id, class_name, title, handler, attributes);
};

Button.prototype = new ButtonBase();

window.templates["button"] = function(id, class_name, title, handler, attributes)
{
  var attrs = [];
  for (var attr in attributes)
  {
    attrs.push(attr, attributes[attr]);
  }

  return [
    "button",
    "",
    "id", id,
    "class", "ui-control " + class_name,
    "title", title,
    "handler", handler || id
  ].concat(attrs);
};

