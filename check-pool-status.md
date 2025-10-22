# Check Pool Status

## Quick Check - Has the pool been initialized?

Run this in Solana Playground or CLI:

```bash
# Check if pool account exists
solana account Hf38P6icw2npaFneCJp4LbcPxJqmnD957FXjPCb9nCHs --url mainnet-beta

# Or use anchor:
anchor account pool --provider.cluster mainnet
```

## Pool PDA Address

Your pool PDA should be at:
- Seeds: `["pool"]`
- Program: `Hf38P6icw2npaFneCJp4LbcPxJqmnD957FXjPCb9nCHs`

Calculate PDA:
```javascript
const [poolPDA] = await PublicKey.findProgramAddress(
  [Buffer.from('pool')],
  new PublicKey('Hf38P6icw2npaFneCJp4LbcPxJqmnD957FXjPCb9nCHs')
);
console.log('Pool PDA:', poolPDA.toString());
```

## If Pool NOT Initialized

You need to run the initialize instruction ONCE:

```bash
# In Solana Playground
cd tests
# Create and run:
anchor test --skip-build --skip-deploy
```

## If Pool IS Initialized

You can proceed with integrating the frontend!

## Next: Create Pool Vault

After initialization, you need a token account for the pool to hold staked tokens:

```bash
# Create associated token account for pool
spl-token create-account <WHISTLE_MINT> --owner <POOL_PDA>
```

Or it will be created automatically on first stake.

---

**Tell me:** Have you initialized the pool yet? (yes/no)

If NO, I'll help you do it now before integrating the frontend.
If YES, I'll proceed with the frontend integration!

