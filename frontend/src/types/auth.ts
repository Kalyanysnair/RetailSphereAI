export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface SignupCredentials {
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ValidationErrors {
  username?: string;
  password?: string;
  general?: string;
}

export interface SignupValidationErrors {
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export interface LoginFormProps {
  onSubmit?: (credentials: LoginCredentials) => Promise<void> | void;
  isLoading?: boolean;
}

export interface SignupFormProps {
  onSubmit?: (credentials: SignupCredentials) => Promise<void> | void;
  isLoading?: boolean;
}
