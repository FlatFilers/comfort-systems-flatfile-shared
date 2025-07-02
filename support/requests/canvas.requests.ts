import { GetRequest } from "../utils/requests/get.request";
import { PatchRequest } from "../utils/requests/patch.request";
import { PostRequest } from "../utils/requests/post.request";

export class CreateCanvasRequest extends PostRequest<any, any> {
  constructor(config: any) {
    super([], config);
  }
  path = `/v1/canvases`;
}

export class UpdateCanvasRequest extends PatchRequest<any, any> {
  path = `/v1/canvases/:canvasId`;
}

export class GetCanvasRequest extends GetRequest<any> {
  path = `/v1/canvases/:canvasId`;
}

export class CreateCanvasAreaRequest extends PostRequest<any, any> {
  constructor(config: any) {
    super([], config);
  }
  path = `/v1/canvas-areas`;
}

export class UpdateCanvasAreaRequest extends PatchRequest<any, any> {
  path = `/v1/canvas-areas/:canvasAreaId`;
}

export class GetCanvasAreaRequest extends GetRequest<any> {
  path = `/v1/canvas-areas/:canvasAreaId`;
}

export class ListCanvasAreasRequest extends GetRequest<any[]> {
  constructor(opts?: Record<string, any>) {
    super([], opts as any);
  }

  path = `/v1/canvas-areas`;
}