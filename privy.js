import {PrivyClient} from '@privy-io/server-auth';

(
    async () => {
        try {
            const client = new PrivyClient(
                process.env.PRIVY_APP_ID,
                process.env.PRIVY_APP_SECRET,
                {
                    timeout: 15000, // Optional: Increased timeout for wallet operations
                    walletApi: {
                        apiURL: 'https://api.privy.io'
                    }
                }
            );



            // const user = await client.walletApi.create({
            //     chainType: 'solana',
            //     idempotencyKey: '1111',
            // });
            // console.log(user);

            //const users = await client.getUsers();
            //console.log(users);

            // Your code here
            // console.log('Hello, world!');
        } catch (error) {
            console.error('Error:', error);
        }
    }
)();