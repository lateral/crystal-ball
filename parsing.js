// Version 1.0.1

// Permitted deviation in Minkowski dot product for input points
const MDP_INPUT_TOLERANCE = 1e-9;

/* Given a string `text` that is a JSON encoding of an Array of points with the
 * specified number of coordinates, (themselves Arrays), return the decoding,
 * raising informative exceptions if this fails.
 */
function parse_points(text, expected_length) {
  var new_points;
  try {
    new_points = JSON.parse(text);
  } catch(e) {
    throw 'Points not valid JSON';
  }
  if (!Array.isArray(new_points)) {
    throw 'Points input must be an array of points.';
  }
  $.each(new_points, function(i, point) {
    if (!Array.isArray(point) || point.length != expected_length) {
      throw 'Point ' + i + ' has length ' + point.length + ', should be ' + expected_length + '.';
    }
    $.each(point, function(j, value) {
      if (isNaN(value)) {
        throw 'Point co-ordinates must be numeric!';
      }
    });
  });
  return new_points;
}

/* Given a string `text` that is a JSON encoding of an Array of points on the
 * Poincaré disc, return the decoded points as points on the hyperboloid,
 * raising informative exceptions if this fails.
 */
function parse_poincare_disc_points(text) {
  var new_ppoints = parse_points(text, 2);  // expect 2 coords per point
  var new_points = []
  $.each(new_ppoints, function(index, ppoint) {
    if (norm(ppoint) >= 1) {
      throw 'Point ' + index + ' is outside of the Poincaré disc!';
    }
    new_points.push(disc_to_hyperboloid(ppoint));
  });
  return new_points;
}

/* Given a string `text` that is a JSON encoding of an Array of hyperboloid
 * points (themselves Arrays), return the decoding, raising informative
 * exceptions if this fails.
 */
function parse_hyperboloid_points(text) {
  var new_points = parse_points(text, 3);  // expect 3 coords per point
  $.each(new_points, function(i, point) {
    var mdp = minkowski_dot(point, point);
    if (Math.abs(mdp + 1) > MDP_INPUT_TOLERANCE) {
      throw 'Point ' + i + ' has Minkowski dot product ' + mdp + ' != -1.';
    }
  });
  return new_points;
}

/* Given a string that is a JSON-encoding of the edge data, return the edge
 * data, or raise an informative error message if this fails.
 */
function parse_edges(text, last_index) {
  var new_edges;
  try {
    new_edges = JSON.parse(text);
  } catch(e) {
    throw 'Edges not valid JSON.';
  }
  if (!Array.isArray(new_edges)) {
    throw 'Edges list should be an array.';
  }
  $.each(new_edges, function(i, edge) {
    if (!Array.isArray(edge) || edge.length != 2) {
      throw 'Each edge should be an array of length 2.';
    }
    $.each(edge, function(j, value) {
      if (!Number.isInteger(value)) {
        throw 'Edge index ' + value + ' is not an integer!';
      }
      if (value < 0 || value > last_index) {
        throw 'Edge index ' + value + ' is out of range (use 0-offset).';
      }
    });
  });
  return new_edges;
}

/* Return a pretty string representation of the provided array.
 */
function array_to_pretty_string(values) {
  return JSON.stringify(values).split(',').join(', ').split('],').join('],\n');
}
