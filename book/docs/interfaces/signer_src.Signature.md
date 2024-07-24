Represents a raw digital signature.

## Table of contents

### Properties

- [fullSig](signer_src.Signature.md#fullsig)
- [r](signer_src.Signature.md#r)
- [s](signer_src.Signature.md#s)
- [v](signer_src.Signature.md#v)

## Properties

### fullSig

• **fullSig**: `string`

A string representing the complete signature, often a concatenation of the `r` and `s` values.

___

### r

• `Optional` **r**: `string`

A hexadecimal string representing the first part of the ECDSA signature.

___

### s

• `Optional` **s**: `string`

A hexadecimal string representing the second part of the ECDSA signature.

___

### v

• `Optional` **v**: `number`

An integer representing the recovery id, which is used in some blockchains to recover the public key from the signature.
