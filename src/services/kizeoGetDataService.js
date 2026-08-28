import "dotenv/config";

const token = process.env.KIZEO_API_KEY;

const VALID_OPERATORS = ["=", ">", ">=", "<", "<=", "!=", "like", "notlike"];
const VALID_FORMATS = ["basic", "simple"];
const VALID_ORDERS = ["asc", "desc"];
const VALID_GROUP_TYPES = ["AND", "OR"];
const VALID_COMPONENT_TYPES = ["simple"];
 
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
 
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
 
function isPositiveInteger(value) {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

function validateComponent(component, context) {
  if (!isPlainObject(component)) {
    throw new TypeError(
      `${context} must be an object { field, operator, type, val }, received: ${JSON.stringify(component)}`
    );
  }
  if (!isNonEmptyString(component.field)) {
    throw new TypeError(`${context}.field must be a non-empty string`);
  }
  if (!VALID_OPERATORS.includes(component.operator)) {
    throw new TypeError(
      `${context}.operator must be one of [${VALID_OPERATORS.join(", ")}], received: ${JSON.stringify(component.operator)}`
    );
  }
  if (component.type !== undefined && !VALID_COMPONENT_TYPES.includes(component.type)) {
    throw new TypeError(
      `${context}.type must be one of [${VALID_COMPONENT_TYPES.join(", ")}], received: ${JSON.stringify(component.type)}`
    );
  }
  if (typeof component.val !== "string" && typeof component.val !== "number") {
    throw new TypeError(`${context}.val must be a string or number, received: ${typeof component.val}`);
  }
}

function validateFilterGroup(group, context) {
  if (!isPlainObject(group)) {
    throw new TypeError(`${context} must be an object { type, components }, received: ${JSON.stringify(group)}`);
  }
  if (!VALID_GROUP_TYPES.includes(group.type)) {
    throw new TypeError(
      `${context}.type must be one of [${VALID_GROUP_TYPES.join(", ")}], received: ${JSON.stringify(group.type)}`
    );
  }
  if (!Array.isArray(group.components)) {
    throw new TypeError(`${context}.components must be an array of filter components`);
  }
  group.components.forEach((c, i) => validateComponent(c, `${context}.components[${i}]`));
}

function validateBaseBody(baseBody) {
  if (baseBody === undefined) return;
 
  if (!isPlainObject(baseBody)) {
    throw new TypeError(`baseBody must be an object, received: ${typeof baseBody}`);
  }
 
  if ("limit" in baseBody || "offset" in baseBody) {
    throw new TypeError(
      "baseBody must not include 'limit' or 'offset' — getAllData controls those internally to paginate."
    );
  }
 
  if (baseBody.format !== undefined && !VALID_FORMATS.includes(baseBody.format)) {
    throw new TypeError(
      `baseBody.format must be one of [${VALID_FORMATS.join(", ")}], received: ${JSON.stringify(baseBody.format)}`
    );
  }
 
  if (baseBody.global_filters !== undefined) {
    if (!Array.isArray(baseBody.global_filters)) {
      throw new TypeError("baseBody.global_filters must be an array of filters");
    }
    baseBody.global_filters.forEach((f, i) => validateFilter(f, `baseBody.global_filters[${i}]`));
  }
 
  if (baseBody.filters !== undefined) {
    if (!Array.isArray(baseBody.filters)) {
      throw new TypeError(
        "baseBody.filters must be an array of filter groups: [{ type: 'AND'|'OR', components: [...] }]"
      );
    }
    baseBody.filters.forEach((group, i) => validateFilterGroup(group, `baseBody.filters[${i}]`));
  }
 
  if (baseBody.order_by !== undefined) {
    if (!Array.isArray(baseBody.order_by)) {
      throw new TypeError('baseBody.order_by must be an array of { field, order }');
    }
    baseBody.order_by.forEach((o, i) => {
      if (!isPlainObject(o) || !isNonEmptyString(o.field) || !VALID_ORDERS.includes(o.order)) {
        throw new TypeError(
          `baseBody.order_by[${i}] must be { field: string, order: "asc"|"desc" }, received: ${JSON.stringify(o)}`
        );
      }
    });
  }
}

async function kizeoGetDataService(formId, baseBody = {}, pageSize = 200) {
  try {
    if (!isNonEmptyString(formId)) {
      throw new TypeError(`formId must be a non-empty string, received: ${JSON.stringify(formId)}`);
    }
  
    validateBaseBody(baseBody);
    const body = baseBody === undefined ? {} : baseBody;

    const resolvedPageSize = pageSize === undefined ? 200 : pageSize;
    if (!isPositiveInteger(resolvedPageSize)) {
      throw new TypeError(`pageSize must be a positive integer, received: ${JSON.stringify(pageSize)}`);
    }
  
    const all = [];
    let offset = 0;
  
    while (true) {
      const response = await fetch(`https://www.kizeoforms.com/rest/v3/forms/${formId}/data/advanced`, {
        method: 'POST',
        headers: {
          Authorization: token,
        },
        body: JSON.stringify({
          ...body,
          format: body.format || "basic",
          limit: resolvedPageSize,
          offset,
        })
      });

      if (!response.ok) {
        throw new Error('Error al obtener los datos de la API');
      }

      const data = await response.json();
      if (!Array.isArray(data.data)) {
        throw new TypeError(`searchDataFn must return an array of records, received: ${typeof data.data}`);
      }

      all.push(...data.data);
      if (data.data.length < resolvedPageSize) break;
      offset += resolvedPageSize;
    }
  
    return all;
  } catch (error) {
    console.error('Error en la API externa:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getListByIdServices(listId) {
  try {
    const response = await fetch(`https://www.kizeoforms.com/rest/v3/lists/${listId}`, {
      method: 'GET',
      headers: {
        Authorization: token,
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener los datos de la API');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en la API externa:', error);
    res.status(500).json({ error: error.message });
  }
};

export { kizeoGetDataService, getListByIdServices};