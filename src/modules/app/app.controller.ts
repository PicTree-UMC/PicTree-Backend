import { Route, Get } from "tsoa";

@Route("app")
export class AppController {
  @Get("/hello")
  public async helloWorld(): Promise<string> {
    return "Hello World";
  }
}