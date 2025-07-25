// checks if a password has at least one uppercase letter and a number or special character
export const PASSWORD_REGEX =
  /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

// checks if a string has only letters, numbers, spaces, apostrophes, dots and dashes
export const NAME_REGEX = /(^[\p{L}\d'\.\s\-]*$)/u;

// checks if a string is a valid slug, useful for usernames
export const SLUG_REGEX = /^[a-z\d]+(?:(\.|-|_)[a-z\d]+)*$/;

// validates if passwords are valid bcrypt hashes
export const BCRYPT_HASH_OR_UNSET =
  /(UNSET|(\$2[abxy]?\$\d{1,2}\$[A-Za-z\d\./]{53}))/;

export const CLOUDINARY_PUBLIC_ID_REGEX = /upload\/(?:v\d+\/)?([^./]+)(?:\.\w+)?$/;


