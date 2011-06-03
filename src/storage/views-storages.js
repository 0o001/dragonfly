window.cls || (window.cls = {});

cls.StorageView = function(id, name, container_class, storage_name)
{
  this.createView = function(container)
  {
    var storage = window.storages[id];
    this._sortable_table = this._sortable_table || new SortableTable(storage.tabledef, null, null, null, "runtime", true);
    container.setAttribute("data-storage-id", storage_name);
    container.setAttribute("data-menu", "storage-view"); // local_storage/session_storage by default

    this._sortable_table.add_listener("before-render", this._before_table_render.bind(this));
    this._sortable_table.add_listener("after-render", this._after_table_render.bind(this));

    if (storage.is_setup)
    {
      if (storage.exists)
      {
        var storage_data = storage.get_storages_plain();
        this._sortable_table.data = storage_data;
        if (!this._update_expiry_interval)
        {
          this._update_expiry_interval = setInterval(this._bound_update_expiry, 15000);
        }
        this._before_table_render(document.querySelector(".sortable-table"));
        table = container.clearAndRender(this._sortable_table.render());
        this._after_table_render(table);
      }
      else
      {
        container.clearAndRender(window.templates.storage.not_existing(storage.storage_object));
      }
    }
    else
    {
      container.innerHTML = "";
      storage.get_storages();
    }
  };

  this._before_table_render = function(table)
  {
    if (table)
    {
      // save selection
      var selection = table.querySelectorAll(".selected");
      this._restore_selection = this._restore_selection || [];
      for (var i=0, selected_node; selected_node = selection[i]; i++) {
        this._restore_selection.push(selected_node.getAttribute("data-object-id"));
      };
    }
  }

  this._after_table_render = function(table)
  {
    if(table)
    {
      if (this._restore_selection)
      {
        for (var i=0, objectref; objectref = this._restore_selection[i]; i++)
        {
          var elem = table.querySelector("[data-object-id='"+objectref+"']");
          if (elem)
          {
            elem.addClass("selected");
          }
        };
        this._restore_selection = null;
      }
      // add context menus and handlers to rows
      for (var i=0, row; row = table.childNodes[i]; i++)
      {
        row.setAttribute("data-menu", "storage-item");
        row.setAttribute("handler", "storage-row");
        row.setAttribute("edit-handler", "storage-row");
      }
      // textarea-autosize
      var data_storage_id = table.get_attr("parent-node-chain", "data-storage-id");
      var autosize_elements = table.querySelectorAll("textarea");
      var broker = ActionBroker.get_instance();
      for (var i=0, element; element = autosize_elements[i]; i++) {
        broker.dispatch_action(data_storage_id, "textarea-autosize", null, element);
      };
    }
  };

  this.on_storage_update = function(msg)
  {
    if (msg.storage_id == this.id)
    {
      this.update();
    }
  };

  window.storages[id].addListener("storage-update", this.on_storage_update.bind(this));
  this.init(id, name, container_class, null, "storage-view");
};
cls.StorageView.prototype = ViewBase;
