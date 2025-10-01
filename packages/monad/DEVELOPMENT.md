## SOLANA DEVELOPMENT

### Running Tests

The Solana package has a set of unit tests that can be run using the `npm run test` command.

In addition, there is a set of integration tests that will require setting the `TEST_MONAD_MNEMONIC` environment variable.
You can set it in your shell and run the tests with the following command:

```bash
export TEST_SOLANA_MNEMONIC="your mnemonic here"
npm run test:integration -w packages/monad
```
