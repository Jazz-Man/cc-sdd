export class HomeDirectoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HomeDirectoryError";
  }
}

export class ParentDirectoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParentDirectoryError";
  }
}

export class AbsolutePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbsolutePathError";
  }
}

export class HomeVariableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HomeVariableError";
  }
}
