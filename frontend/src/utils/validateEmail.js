export const validateEmail = (input) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!input) {
    setError(true);
    setHelperText("Email is required.");
  } else if (!emailRegex.test(input)) {
    setError(true);
    setHelperText("Invalid email format.");
  } else {
    setError(false);
    setHelperText("");
  }
  setEmail(input);
};
