var base_pt = [0.0, 0.0, 1.0]; // base point of the hyperboloid

// the maximum (hyperbolic) distance from the centre of the disc at which the dragging works
var action_radius = 2;

// whether or not the mouse is currently down in the region where dragging is permitted
var dragging = false;

const none_selected = -1;
// the index of the currently selected point (if any)
var index_of_selected = none_selected;
// where the currently selected point has been dragged to
var location_of_selected = base_pt;

// don't bother redrawing the points if the drag travelled less hyperbolic distance than this (for numerical stability)
var distance_threshold = 0.000001;

// minimum length of a tangent vector to bother computing its exponential (for numerical stability)
var exp_distance_threshold = 0.0000001;

// the point (on the hyperboloid) represented by where the cursor was last time
var last_pt;

var max_point_size = 7;

var canvas;
var radius_in_pixels;

const COLOR_UNSELECTED = "rgba(0, 0, 255, 0.75)";
const COLOR_SELECTED = "rgba(255, 0, 0)";


function dot(pt0, pt1) {
  // Return Euclidean dot product
  var sum = 0;
  for (var i=0; i < pt0.length; i++) {
    sum = sum + pt0[i] * pt1[i];
  }
  return sum;
}

function norm(pt) {
  // Return the Euclidean norm
  var dp = dot(pt, pt);
  return Math.sqrt(dp);
}

function minkowski_dot(pt0, pt1) {
  var sum = 0;
  var n = pt0.length;
  for (var i=0; i < n - 1; i++) {
    sum = sum + pt0[i] * pt1[i];
  }
  sum -= pt0[n-1] * pt1[n-1];
  return sum;
}

function hyperboloid_distance(pt0, pt1) {
  // return the distance between two points on the hyperboloid
  return Math.acosh(-1 * minkowski_dot(pt0, pt1));
}

function mult(scalar, vec) {
  // multiply a vector by a scalar
  var res = [];
  for (var i=0; i < vec.length; i++) {
    res.push(scalar * vec[i]);
  }
  return res;
}

function sum(vec0, vec1) {
  // sum two vectors, component-wise
  var res = [];
  for (var i=0; i < vec0.length; i++) {
    res.push(vec0[i] + vec1[i]);
  }
  return res;
}

function invert_thru_boundary(pt) {
  // Given a point `pt` on the Poincaré disc (not the origin), return its
  // inversion through the boundary of disc.
  return mult(1. / dot(pt, pt), pt);
}

function centre_of_arc_through(pt0, pt1) {
  // Given two points on the Poincaré disc not both lying on a ray from the
  // origin, return the centre of the circle that passes through both and
  // meets the disc boundary at right angles.
  var mat = [pt0, pt1];
  var target = mult(0.5, [1 + dot(pt0, pt0), 1 + dot(pt1, pt1)]);
  var centre = apply_matrix(invert_matrix(mat), target);
  return centre;
}

function invert_matrix(mat) {
  // Return the inverse of the provided 2x2 matrix
  var det = mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
  return [
    mult(1./ det, [mat[1][1], -1 * mat[0][1]]),
    mult(1./ det, [-1 * mat[1][0], mat[0][0]]),
  ];
}

function apply_matrix(mat, vector) {
  // note matrix application is from the left - this is easier since we write them in row major order
  var result = Array();
  for (var i=0; i < mat.length; i++) {
    result.push(dot(mat[i], vector));
  }
  return result;
}

function exponential(base, tangent) {
  // base is a point on the hyperboloid, tangent is in its tangent space
  var norm = minkowski_norm(tangent);
  if (norm < exp_distance_threshold) {
    return base;
  }
  var a = Math.cosh(norm);
  var b = Math.sinh(norm) / norm;
  return sum(mult(a, base), mult(b, tangent));
}

function minkowski_norm(vec) {
  var mdp = minkowski_dot(vec, vec);
  return Math.sqrt(mdp);
}

function logarithm(base, other) {
  // base and other are points on the hyperboloid
  var mdp = minkowski_dot(base, other);
  var dist = hyperboloid_distance(base, other);
  var proj = sum(other, mult(mdp, base));
  var norm = minkowski_norm(proj);
  if (norm > exp_distance_threshold) {
    proj = mult(dist / norm, proj);
  }
  return proj;
}

function geodesic_parallel_transport(base, direction, tangent) {
  // base is a point on the hyperboloid
  // direction and tangent are both tangent vectors at that point (not necessarily unit vectors)
  var norm_of_direction = minkowski_norm(direction);
  var unit_direction = mult(1.0 / norm_of_direction, direction);
  var parallel_component = minkowski_dot(tangent, unit_direction);
  var unit_direction_transported = sum(mult(Math.sinh(norm_of_direction), base), mult(Math.cosh(norm_of_direction), unit_direction));
  return sum(sum(mult(parallel_component, unit_direction_transported), tangent), mult(-1 * parallel_component, unit_direction));
}

function hyperboloid_to_disc(pt) {
  // map a 3-vector from the hyperboloid to the corresponding 2-vector on the Poincaré disc
  return [pt[0] / (pt[2] + 1), pt[1] / (pt[2] + 1)];
}

function disc_to_hyperboloid(pt) {
  // map a 2-vector from the Poincaré disc to the corresponding 3-vector on the hyperboloid
  var norm_sqd = dot(pt, pt);
  var factor = 2.0 / (1 - norm_sqd);
  var hyper_pt = [factor * pt[0], factor * pt[1], (1 + norm_sqd) / (1 - norm_sqd)];
  return hyper_pt;
}

function disc_tangent_to_hyperboloid(disc_pt, disc_tangent) {
  // given a point on the Poincaré disc and a tangent at that point, return the corresponding tangent vector to the hyperboloid (at the corresponding point)
  var hyper_pt = disc_to_hyperboloid(disc_pt);
  var dp = dot(disc_pt, disc_tangent);
  var factor = hyper_pt[2] + 1;
  return mult(factor, [hyper_pt[0] * dp + disc_tangent[0], hyper_pt[1] * dp + disc_tangent[1], factor * dp])
}

function disc_to_canvas(disc_pt) {
  // map a 2-vector on the Poincaré disc to its co-ordinates on the canvas
  return [(1 + disc_pt[0]) * radius_in_pixels, (1 - disc_pt[1]) * radius_in_pixels];
}

function canvas_to_disc(coords) {
  // inverse of disc_to_canvas
  return [(coords[0] / radius_in_pixels - 1), (coords[1] / radius_in_pixels - 1) * -1]
}

function point_radius(point) {
  // return the radius of the representation of the (hyperboloid) point as a circle on the canvas
  var dist = hyperboloid_distance(base_pt, point);
  // shrink the point size by the distance from the centre point
  return Math.max(max_point_size - 2 * dist, 1);
}

function draw_edge(pt0, pt1) {
  var ppt0 = hyperboloid_to_disc(pt0);
  var ppt1 = hyperboloid_to_disc(pt1);
  var arc_centre = centre_of_arc_through(ppt0, ppt1);
  var radius = Math.sqrt(dot(arc_centre, arc_centre) - 1);
  var angle0 = argument(ppt0, arc_centre);
  var angle1 = argument(ppt1, arc_centre);
  // TODO is there a simpler version of the following?
  if (angle1 < angle0) {
    // angles are the wrong way around, so swap them
    var tmp = angle0;
    angle0 = angle1;
    angle1 = tmp;
  }
  // we know that the arc length should be less than PI, so check that, swap if wrong way around
  if (angle1 - angle0 < Math.PI) {
    draw_arc(arc_centre, radius, angle0, angle1);
  } else {
    draw_arc(arc_centre, radius, angle1, angle0);
  }
}

function draw() {
  // redraw all the points on the canvas
  canvas.width = canvas.width;  // clear the canvas
  $.each(edges, function(index, edge) {
    draw_edge(points[edge[0]], points[edge[1]]);
  });
  $.each(points, function(index, point) {
    var canvas_pt = disc_to_canvas(hyperboloid_to_disc(point));
    var color = COLOR_UNSELECTED;
    if (index == index_of_selected) {
      color = COLOR_SELECTED;
    }
    draw_point(canvas_pt, point_radius(point), color);  
    draw_text(index.toString(), canvas_pt, 4 * point_radius(point));
  });
  if (index_of_selected != none_selected) {
    var canvas_pt = disc_to_canvas(hyperboloid_to_disc(location_of_selected));
    var  color = COLOR_SELECTED;
    draw_edge(points[index_of_selected], location_of_selected);
    draw_point(canvas_pt, point_radius(location_of_selected), color);  
  }
  draw_disc_boundary();
  // also update the text boxes
  $('#points_input').val(array_to_pretty_string(points));
  $('#edges_input').val(array_to_pretty_string(edges));
}

function array_to_pretty_string(values) {
  return JSON.stringify(values).split(',').join(', ').split('],').join('],\n');
}

function argument(pt, centre) {
  // Returns the angle of pt with respect to a circle centred at `centre`.
  // The returned angle is non-negative and represents the COUNTER-clockwise angle from the horizontal.
  var recentred = sum(pt, mult(-1., centre));
  var clockwise_angle = Math.atan2(recentred[1], recentred[0]);  // note the ordering of the arguments!
  var ccw_angle = -1 * clockwise_angle;
  if (ccw_angle < 0) {
    ccw_angle += 2 * Math.PI;
  }
  return ccw_angle;
}

function draw_arc(centre, radius, angle0, angle1) {
  var canv_centre = disc_to_canvas(centre);
  var canv_radius = radius_in_pixels * radius;
  var ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.arc(canv_centre[0], canv_centre[1], canv_radius, angle0, angle1);
  ctx.stroke();
}

function get_canvas_coords(event){
  // return the canvas coordinates where the provided event (e.g. mousedown) occurred
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
  return [x, y];
}

function draw_disc_boundary() {
    var ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(radius_in_pixels, radius_in_pixels, radius_in_pixels, 0, Math.PI * 2);
  ctx.stroke();
}

function draw_point(canvas_pt, point_size, color) {
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(canvas_pt[0], canvas_pt[1], point_size, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw the provided text using the current fillStyle of the canvas.
 */
function draw_text(text, canvas_pt, font_size) {
    var ctx = canvas.getContext("2d");
  ctx.font = font_size + 'px Arial';
    ctx.fillText(text, canvas_pt[0] + 5, canvas_pt[1]);
}

function euclidean_distance(pt0, pt1) {
  var sum = 0.;
  for (var i=0; i < pt0.length; i++) {
    sum = sum + Math.pow(pt0[i] - pt1[i], 2);
  }
  return Math.sqrt(sum);
}

$(document).ready(function() {
  canvas = $('#canvas')[0];
  radius_in_pixels = canvas.width / 2;
  draw();
  $('#update_button').click(function(e) {
    points = JSON.parse($('#points_input').val());
    edges = JSON.parse($('#edges_input').val());
    // FIXME should check points are on hyperboloid and edge indices make sense
    draw();
  });
  $('#canvas').mousedown(function(e) {
      var coords = get_canvas_coords(e); 
    var pt = disc_to_hyperboloid(canvas_to_disc(coords));
    if (hyperboloid_distance(base_pt, pt) > action_radius) {
      // ignore clicks that occur too far out since a small drag would
      // have too large an effect
      return
    }
    $.each(points, function(index, point) {
      var canvas_pt = disc_to_canvas(hyperboloid_to_disc(point));
      if (euclidean_distance(canvas_pt, coords) <= point_radius(point)) {
        // click occurred within the point as represented on the canvas
        index_of_selected = index;
        location_of_selected = point;
      }
    });
    dragging = true;
    if (index_of_selected == none_selected) {
      // user is dragging the ambient
      $('#canvas').css('cursor', 'move');
    } else {
      // user is dragging a single point
      $('#canvas').css('cursor', 'hand');
    }
    last_pt = pt;
    draw();
  });
  $('#canvas').mousemove(function(e) {
    var coords = get_canvas_coords(e); 
    var disc_pt = disc_to_hyperboloid(canvas_to_disc(coords));
    if (dragging) {
      if (index_of_selected == none_selected) {
        if (hyperboloid_distance(base_pt, disc_pt) > action_radius) {
          dragging = false;
          $('#canvas').css('cursor', 'not-allowed');
          return;
        }
        // user is dragging the ambient
          $('#canvas').css('cursor', 'move');
          var dist = hyperboloid_distance(last_pt, disc_pt);
          if (dist > distance_threshold) {
            // if distance is too small, then do nothing (for
            // numerical stability)
            var delta = logarithm(last_pt, disc_pt); // hyperboloid tangent representing mouse movement
            for (var i=0; i < points.length; i++) {
              var _log = logarithm(last_pt, points[i]);
              var transported_log = geodesic_parallel_transport(last_pt, delta, _log);
              points[i] = exponential(disc_pt, transported_log);
            }
            last_pt = disc_pt;
          }
      } else {
        // user is dragging a single point
        $('#canvas').css('cursor', 'hand');
        // calculate the euclidean (=canvas) displacement vector
        // between the original point location and the cursor
        // location
        var coords_at_cursor = get_canvas_coords(e); 
        var start_pt = hyperboloid_to_disc(points[index_of_selected]);
        var coords_at_start = disc_to_canvas(start_pt);
        var canvas_disp = sum(coords_at_cursor, mult(-1, coords_at_start));
        canvas_disp[1] = -1 * canvas_disp[1];  // the vertical coordinate is _down_ on the canvas
        // scale this vector using the euclidean norm of the
        // original point to become a Poincaré disc tangent at that
        // point (with the same length) (this is the conformal
        // scaling)
        var scaling = (1 - Math.pow(norm(start_pt), 2));  // FIXME is thiscaling the correct way around?
        var disc_tangent = mult(scaling / radius_in_pixels, canvas_disp);  // FIXME tidy up -- need to incorporate canvas radius
        // calculate the corresponding tangent on the hyperboloid
        var hyperboloid_tangent = disc_tangent_to_hyperboloid(start_pt, disc_tangent);
        // apply the exponential map to that tangent (at the
        // correspondining hyperboloid point)
        location_of_selected = exponential(points[index_of_selected], hyperboloid_tangent);
      }
      draw();
    } else {
      $('#canvas').css('cursor', 'default');
    }
  });
  $('#canvas').mouseup(function(e) {
    dragging = false;
    if (index_of_selected != none_selected) {
      points[index_of_selected] = location_of_selected;
    }
    index_of_selected = none_selected;
    $('#canvas').css('cursor', 'default');
    draw();
  });
});
