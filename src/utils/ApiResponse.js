class ApiResponse {
  constructor(statusCode, message = "success", data = null) {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }
}
export { ApiResponse };
